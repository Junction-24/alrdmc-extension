const DEFAULT_PARAMS = {
    temperature: 1.0,
    topK: 5
};

let session;

// let summarization_session;
// We're not using this for now so we don't need to create a session

const prompt_summarize_parts_article = "Generate one very short single sentence that summarizes the following text, in a maximum of 10 words:\n";
const prompt_generate_topic = "Given the following phrases about an article, generate a topic description about it:\n";

function is_news_website() {
    // Let's check if there's a meta tag with property="og:type" and content="article"
    if (document.querySelector('meta[property="og:type"][content="article"]'))
        return true;
    // Let's check if there's any <article> tag in the page
    if (document.querySelector('article'))
        return true;

    return false;
}

async function runPrompt(prompt) {
    try {
        session = await window.ai.languageModel.create(DEFAULT_PARAMS);
        console.log('Session created');
        return session.prompt(prompt); 
    } catch (e) {
        console.log('Prompt failed');
        console.error(e);
        console.log('Prompt:', prompt);
        // Reset session
        session.reset();
        throw e;
    }
}

async function summarize_text(text) {
    // Just use the prompt API to summarize the text
    return await runPrompt(prompt_summarize_parts_article + text);
    // Call the summarization API
    /* try {
        if (!summarization_session) {
            summarization_session = await window.ai.summarizer.create(DEFAULT_PARAMS);
            console.log('Summarization session created');
        }
        return summarization_session.summarize(text);
    } catch (e) {
        console.log('Summarization failed');
        console.error(e);
        console.log('Text:', text);
        // Reset session
        session.reset();
        throw e;
    } */
}

async function split_article(content, max_length = 1000) {
    // Because the AI model has a limit of 1024 tokens, we need to split the article into parts and summarize each part
    // We'll ask the model to write a one-sentence summary of each part. Then, we'll combine the summaries to create a summary of the whole article
    const parts = [];

    // Generate parts of up to max_text_length characters
    const selected_paragraphs = content.querySelectorAll('p');
    let part = '';
    for (let node of selected_paragraphs) {
        console.debug('Node:', node);
        // Get the text content of the node
        const text = node.textContent;

        // Would adding this text to the part make it too long?
        const numTokens = (prompt_summarize_parts_article + part + ' ' + text).length * 0.3; // 0.3 tokens per characters (approximate)
        console.debug('Num tokens:', numTokens); 
        if (numTokens > max_length) {
            // Remove any spaces at the start or end
            parts.push(part.trim());
            part = text;
        }
        else {
            part += ' ' + text;
        }
    }

    if (part.length > 0) {
        parts.push(part.trim());
    }

    return parts;
}

async function generate_topic(content) {
    return await runPrompt(prompt_generate_topic + content);
}

async function get_relevant_topics(topic_embedding) {
    // API call to the backend
    return [];
}

async function process_articles() {
    const article = document.querySelector('article');

    let parts = await split_article(article);
    console.log('Parts:', parts);

    let sentences = [];
    for (let part of parts) {
        sentences.push(await summarize_text(part));
    }

    console.log('Sentences:', sentences);

    let topic = await generate_topic(sentences.join('\n'));

    console.log("TOPIC:", topic);

    chrome.runtime.sendMessage({
        action: "get_topic_embedding",
        topic: topic
    }, async (response) => {
        let topic_embedding = response;

        console.log("Topic embedding:", topic_embedding);

        let relevant_topics = await get_relevant_topics(topic_embedding);

        console.log("Relevant topics:", relevant_topics);
    });
}

if (is_news_website()) {
    console.info('This is a news website');

    // Try to create a session when the content script is loaded
    try {
        window.ai.languageModel.create(DEFAULT_PARAMS).then((created_session) => {
            session = created_session;
            console.log('Session created');
            return process_articles()
        }).then(console.log);
    } catch (e) {
        console.error(e);
    }
}