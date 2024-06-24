# TTS-Assistant

ML-powered speech recognition directly in your browser! Built with [🤗 Transformers.js](https://github.com/xenova/transformers.js).

![image](https://github.com/hyzco/TTS-Assistant/assets/48827301/9adba82b-aa8a-44bd-8649-36963d21358b)

## Running locally

1. Clone the repo and install dependencies:

    ```bash
    git clone https://github.com/hyzco/TTS-Assistant.git
    cd whisper-web
    npm install
    ```

2. Run the development server:

    ```bash
    npm run dev
    ```
    > Firefox users need to change the `dom.workers.modules.enabled` setting in `about:config` to `true` to enable Web Workers.
    > Check out [this issue](https://github.com/xenova/whisper-web/issues/8) for more details.

3. Open the link (e.g., [http://localhost:5173/](http://localhost:5173/)) in your browser.

## Running backend RAG application, to be able to chat with LLM, get real time weather information by given location, taking notes, and retrieving it from the Cassandra vector store.
Check out repo: 
https://github.com/hyzco/LLM-Rag-Application
