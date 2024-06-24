/* eslint-disable camelcase */
import { pipeline, env, AutoTokenizer, AutoModelForCausalLM } from "@xenova/transformers";

// Disable local models
env.allowLocalModels = false;

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
    static task = null;
    static model = null;
    static quantized = null;
    static instance = null;

    constructor(tokenizer, model, quantized) {
        this.tokenizer = tokenizer;
        this.model = model;
        this.quantized = quantized;
    }

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, {
                quantized: this.quantized,
                progress_callback,

                // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
                revision: this.model.includes("/whisper-medium")
                    ? "no_attentions"
                    : "main",
            });
        }

        return this.instance;
    }

    static getModelName() {
        return this.model;
    }

    static getTaskName() {
        return this.TaskName;
    }
}

self.addEventListener("message", async (event) => {
    const message = event.data;

    console.log("message: ", message);
    // Do some work...
    // TODO use message data
    let transcript = await transcribe(
        message.audio,
        message.model,
        message.multilingual,
        message.quantized,
        message.subtask,
        message.language,
    );
    if (transcript === null) return;

    console.log("transcript: ", transcript);
    // console.log("Answer: ", answer);
    // const tokenizer = await AutoTokenizer.from_pretrained('microsoft/Phi-3-vision-128k-instruct');
    // let model = await AutoModel.from_pretrained('microsoft/Phi-3-vision-128k-instruct');

    // const encoded = tokenizer.encode(transcript.text);
    // const answer = await generateAnswer(transcript.text, 'Xenova/TinyLlama-1.1B-Chat-v1.0')

    // let outputs = await model.generate(encoded);
    // let decoded = tokenizer.decode(outputs[0], { skip_special_tokens: true });

    // Define the list of messages
    // const model_path = 'Felladrin/onnx-llama2_xs_460M_experimental';
    // const model = await AutoModelForCausalLM.from_pretrained(model_path);
    // const tokenizer = await AutoTokenizer.from_pretrained(model_path);

    // const prompt = `Q: ${transcript.text}?\nA:`;
    // const { input_ids } = tokenizer(prompt);
    // const tokens = await model.generate(input_ids);
    // console.log(tokenizer.decode(tokens[0], { skip_special_tokens: true }));
    // const generator = await pipeline(
    //     "text-generation",
    //     "Xenova/llama-160m",
    // );

    // const messages = [
    //     { role: "system", content: "You are a friendly assistant." },
    //     { role: "user", content: transcript.text },
    // ];

    // // Construct the prompt
    // const prompt = generator.tokenizer.apply_chat_template(messages, {
    //     tokenize: false,
    //     add_generation_prompt: true,
    // });

    // // Generate a response
    // const result = await generator(prompt, {
    //     max_new_tokens: 256,
    //     temperature: 0.7,
    //     do_sample: true,
    //     top_k: 50,
    // });

    // console.log("result", result);
    // Send the result back to the main thread
    self.postMessage({
        status: "complete",
        task: "automatic-speech-recognition",
        data: transcript,
    });
});

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
    static task = "automatic-speech-recognition";
    static model = null;
    static quantized = null;
}

class Text2TextPipelineFactory extends PipelineFactory {
    static task = "text-generation";
    static model = null;
    static quantized = null;
}

const generateAnswer = async (text, model) => {
    let modelName = model;

    const p = Text2TextPipelineFactory;
    if (p.model !== modelName) {
        // Invalidate model if different
        p.model = modelName;

        if (p.instance !== null) {
            (await p.getInstance()).dispose();
            p.instance = null;
        }
    }

    // Load transcriber model
    let generator = await p.getInstance((data) => {
        self.postMessage(data);
    });

    const time_precision =
        generator.processor.feature_extractor.config.chunk_length /
        generator.model.config.max_source_positions;

    // Storage for chunks to be processed. Initialise with an empty chunk.
    let chunks_to_process = [
        {
            tokens: [],
            finalised: false,
        },
    ];

    // TODO: Storage for fully-processed and merged chunks
    // let decoded_chunks = [];

    function chunk_callback(chunk) {
        let last = chunks_to_process[chunks_to_process.length - 1];

        // Overwrite last chunk with new info
        Object.assign(last, chunk);
        last.finalised = true;

        // Create an empty chunk after, if it not the last chunk
        if (!chunk.is_last) {
            chunks_to_process.push({
                tokens: [],
                finalised: false,
            });
        }
    }

    // Inject custom callback function to handle merging of chunks
    function callback_function(item) {
        let last = chunks_to_process[chunks_to_process.length - 1];

        // Update tokens of last chunk
        last.tokens = [...item[0].output_token_ids];

        // Merge text chunks
        // TODO optimise so we don't have to decode all chunks every time
        let data = transcriber.tokenizer._decode_asr(chunks_to_process, {
            time_precision: time_precision,
            return_timestamps: true,
            force_full_sequences: false,
        });

        self.postMessage({
            status: "update",
            task: "automatic-speech-recognition",
            data: data,
        });
    }

    // Actually run transcription
    let output = await generator(text, {
        max_new_tokens: 100,
        // Greedy
        top_k: 0,
        do_sample: false,

        // Sliding window
        chunk_length_s: isDistilWhisper ? 20 : 30,
        stride_length_s: isDistilWhisper ? 3 : 5,

        // Language and task
        language: language,
        task: subtask,

        // Return timestamps
        return_timestamps: true,
        force_full_sequences: false,

        // Callback functions
        callback_function: callback_function, // after each generation step
        chunk_callback: chunk_callback, // after each chunk is processed
    }).catch((error) => {
        self.postMessage({
            status: "error",
            task: p.getTaskName,
            data: error,
        });
        return null;
    });

    return output;
};

const transcribe = async (
    audio,
    model,
    multilingual,
    quantized,
    subtask,
    language,
) => {
    const isDistilWhisper = model.startsWith("distil-whisper/");

    let modelName = model;
    if (!isDistilWhisper && !multilingual) {
        modelName += ".en";
    }

    const p = AutomaticSpeechRecognitionPipelineFactory;
    if (p.model !== modelName || p.quantized !== quantized) {
        // Invalidate model if different
        p.model = modelName;
        p.quantized = quantized;

        if (p.instance !== null) {
            (await p.getInstance()).dispose();
            p.instance = null;
        }
    }

    // Load transcriber model
    let transcriber = await p.getInstance((data) => {
        self.postMessage(data);
    });

    const time_precision =
        transcriber.processor.feature_extractor.config.chunk_length /
        transcriber.model.config.max_source_positions;

    // Storage for chunks to be processed. Initialise with an empty chunk.
    let chunks_to_process = [
        {
            tokens: [],
            finalised: false,
        },
    ];

    // TODO: Storage for fully-processed and merged chunks
    // let decoded_chunks = [];

    function chunk_callback(chunk) {
        let last = chunks_to_process[chunks_to_process.length - 1];

        // Overwrite last chunk with new info
        Object.assign(last, chunk);
        last.finalised = true;

        // Create an empty chunk after, if it not the last chunk
        if (!chunk.is_last) {
            chunks_to_process.push({
                tokens: [],
                finalised: false,
            });
        }
    }

    // Inject custom callback function to handle merging of chunks
    function callback_function(item) {
        let last = chunks_to_process[chunks_to_process.length - 1];

        // Update tokens of last chunk
        last.tokens = [...item[0].output_token_ids];

        // Merge text chunks
        // TODO optimise so we don't have to decode all chunks every time
        let data = transcriber.tokenizer._decode_asr(chunks_to_process, {
            time_precision: time_precision,
            return_timestamps: true,
            force_full_sequences: false,
        });

        self.postMessage({
            status: "update",
            task: "automatic-speech-recognition",
            data: data,
        });
    }

    // Actually run transcription
    let output = await transcriber(audio, {
        // Greedy
        top_k: 0,
        do_sample: false,

        // Sliding window
        chunk_length_s: isDistilWhisper ? 20 : 30,
        stride_length_s: isDistilWhisper ? 3 : 5,

        // Language and task
        language: language,
        task: subtask,

        // Return timestamps
        return_timestamps: true,
        force_full_sequences: false,

        // Callback functions
        callback_function: callback_function, // after each generation step
        chunk_callback: chunk_callback, // after each chunk is processed
    }).catch((error) => {
        self.postMessage({
            status: "error",
            task: "automatic-speech-recognition",
            data: error,
        });
        return null;
    });

    return output;
};
