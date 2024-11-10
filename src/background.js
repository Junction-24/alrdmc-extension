import { pipeline, env } from '@xenova/transformers';

// Skip initial check for local models, since we are not loading any local models.
env.allowLocalModels = false;

// Due to a bug in onnxruntime-web, we must disable multithreading for now.
// See https://github.com/microsoft/onnxruntime/issues/14445 for more information.
env.backends.onnx.wasm.numThreads = 1;

// Check that the AI model is available (https://chromium.googlesource.com/chromium/src/+/main/docs/experiments/prompt-api-for-extension.md#verifying-the-api-is-working)
// The extension authors can verify if the API is available by checking the chrome.aiOriginTrial.languageModel from the service worker script. If the AILanguageModel object is defined, the authors can follow the explainer to test the APIs usage.
if (chrome.aiOriginTrial.languageModel) {
    console.log("AI model is available.");
} else {
    console.error("AI model is not available.");
}

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

// Request to http://34.70.118.142:5000/semantic_vectors
// This will return the data in the format:
// [
//      {
//         "semantic_vector": [0.1, 0.2, 0.3, ...],
//         "url": "https://www.example.com",
//      }
// ]
fetch("http://alr-dmc.duckdns.org:5000/semantic_vectors").then(response => response.json()).catch((e) => {
    // Just return fake data for now
    // Semantic vector has size 384
    const semantic_vector = Array.from({ length: 384 }, () => Math.random());
    return [
        {
            "semantic_vector": semantic_vector,
            "semantic_vector_url": "https://www.example.com",
            "title": "Example Title",
            "description": "Example Description",
            "original_title": "Example Original Title",
            "original_description": "Example Original Description",
        }
    ];
}).then(data => {
    // Store the data in the local storage
    chrome.storage.local.set({ actionables_data: data });
    console.log("Data stored in local storage");
    // Assert that the data is stored correctly
    chrome.storage.local.get('actionables_data', (result) => {
        console.log("Data retrieved from local storage:", result);
    });
}
);

let model = null;
const embed = async (text) => {
    // Actually run the model on the input text
    let result = await model(text);
    return result;
};

console.log("Loading pipeline...");
// Get the pipeline instance. This will load and build the model when run for the first time.
if (PipelineSingleton.instance === null) {
    model = await PipelineSingleton.getInstance((data) => {
        // You can track the progress of the pipeline creation here.
        // e.g., you can send `data` back to the UI to indicate a progress bar
        console.debug('progress', data)
    });
    console.log("Pipeline loaded.");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message);

  if (message.action !== "get_topic_embedding") return;

    (async () => {
        let embedding = await embed(message.topic);
        console.log("Embedding:", embedding);

        // Size of the embeddings: [batch_size, num_tokens, embedding_size]
        // Mean pooling the embeddings across the tokens to get a single embedding for the topic
        let mean_pooled_embedding = embedding.sum(1).mul(1.0 / embedding.dims[1]);

        if (mean_pooled_embedding.dims[0] > 1) {
            console.warn("More than one embedding returned. Using the first one.");
        }

        mean_pooled_embedding = mean_pooled_embedding.view(mean_pooled_embedding.dims[1]);

        sendResponse(mean_pooled_embedding);
    })();

    return true;
});