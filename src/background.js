import { pipeline, env } from '@xenova/transformers';

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

class PipelineSingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { quantized: false, progress_callback });
        }

        return this.instance;
    }
}

const embed = async (text) => {
  // Get the pipeline instance. This will load and build the model when run for the first time.
  let model = await PipelineSingleton.getInstance((data) => {
      // You can track the progress of the pipeline creation here.
      // e.g., you can send `data` back to the UI to indicate a progress bar
      // console.log('progress', data)
  });

  // Actually run the model on the input text
  let result = await model(text);
  return result;
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "get_topic_embedding") return;

    console.log("Message received:", message);

    (async () => {
        let embedding = await embed(message.topic);
        console.log("Embedding:", embedding);

        sendResponse(embedding);
    })();

    return true;
});
