import { AudioManager } from "./components/AudioManager";
import Transcript from "./components/Transcript";
import WebSocketComponent from "./components/WebSocketComponent";
import { WebSocketProvider } from "./context/WebSocketProvider";
import { useTranscriber } from "./hooks/useTranscriber";

function App() {
    const transcriber = useTranscriber();

    return (
        <div className='flex justify-center items-center min-h-screen'>
            <div className='container flex flex-col justify-center items-center'>
                <h1 className='text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl text-center'>
                   EVA WEB
                </h1>
                <h2 className='mt-3 mb-5 px-4 text-center text-1xl font-semibold tracking-tight text-slate-900 sm:text-2xl'>
                   AI-Personal assistant, which can retrieve real time weather information, keep notes and retrieve notes.
                </h2>
                <AudioManager transcriber={transcriber} />
                <WebSocketProvider  url="ws://localhost:8080">
                     <Transcript transcribedData={transcriber.output} />
                     <WebSocketComponent />
                </WebSocketProvider >
            </div>

            <div className='absolute bottom-4'>
                Made with{" "}
                <a
                    className='underline'
                    href='https://github.com/xenova/transformers.js'
                >
                    🤗 Transformers.js
                </a>
            </div>
        </div>
    );
}

export default App;
