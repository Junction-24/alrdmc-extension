import { cos_sim } from '@xenova/transformers';
import { confetti } from '@tsparticles/confetti';

const DEFAULT_PARAMS = {
    // temperature: 1.0,
    // topK: 5
};

let session;

// let summarization_session;
// We're not using this for now so we don't need to create a session

const prompt_summarize_parts_article = "Generate one very short single sentence that summarizes the following text, in a maximum of 10 words and just using English language:\n";
const prompt_generate_topic = "From the following text, generate a list of keywords, separated by comma, related to it:\n";
const prompt_translate = "Translate the following text into English, do not use any other language:\n";

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
    let result;
    try {
        session = await window.ai.languageModel.create(DEFAULT_PARAMS);
        console.log('Session created');
        result = await session.prompt(prompt);
    } catch (e) {
        console.log('Prompt failed');
        console.error(e);
        console.log('Prompt:', prompt);
    }
    return result;
}

async function summarize_text(text) {
    // Just use the prompt API to summarize the text
    return await runPrompt(prompt_summarize_parts_article + text);
}

async function translate(text) {
    return await runPrompt(prompt_translate + text);
}

async function generate_questions_for_actionable(text) {
    try {
        const questionsGeneratorSession = await window.ai.languageModel.create({
            ...DEFAULT_PARAMS,
            initialPrompts: [
                { role: "system", content: "Generate a one-phrase debate idea for a debate about a topic given by the user. The idea should be open-ended and should not be biased. Only write one debate proposition, one sentence, affirming an idea that the user may agree or disagree with. The user only has general knowledge, they do not know about specific projects or technical subjects, so you should keep your debate topics accessible to a general public. The sentence should be something that the user can always express an opinion about. Write debate ideas about what we should do or what the user thinks should happen. Always respect the length limit of 1 sentence." },
                {
                    role: "user", content: `Gender, Economy, and Women's Votes in the 2020 Presidential Election

By examining both sides of this seemingly paradoxical issue, the article aims to provide a nuanced understanding of the 2020 election's outcomes and their broader implications for gender equality and the evolution of political power in America.`
                },
                { role: "assistant", content: "Gender equality should be made a priority." },
                {
                    role: "user", content: `Northern Spain Flooded

A recent period of heavy rainfall caused significant damage and disruptions to transportation in the northern region of Spain.  While the flooding resulted in widespread flooding of roads and infrastructure, authorities reported no fatalities. The event highlighted the vulnerability of the region to extreme weather events and the importance of emergency preparedness.`
                },
                { role: "assistant", content: "Spain should focus on being prepared for natural disasters." },
            ]
        });

        const result = await questionsGeneratorSession.prompt(text);
        // Remove everything after the first period or question mark
        return result.split(/\.|\?/)[0];
    } catch (e) {
        throw e;
    }
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
    let topics = await chrome.storage.local.get('actionables_data');

    console.log("Topics:", topics);

    for (let topic of topics.actionables_data) {
        try {
            let cosine_similarity = cos_sim(Object.values(topic_embedding.data), topic.semantic_vector);

            topic.cosine_similarity = cosine_similarity;
        } catch (e) {
            console.error(e);
            topic.cosine_similarity = 0.0;
        }
    }

    return topics.actionables_data.sort((a, b) => b.cosine_similarity - a.cosine_similarity);
}

let relevant_topics = [];
async function process_articles() {
    const article = document.querySelector('article');

    let parts = await split_article(article);
    console.log('Parts:', parts);

    let sentences = [];
    for (let part of parts) {
        // Split into sentences using regex for common sentence endings
        const sentencesInPart = part.match(/[^.!?]+[.!?]+/g) || [part];
        
        // Take maximum 4 sentences
        const limitedSentences = sentencesInPart.slice(0, 4);

        // Add translated sentences
        for (let sentence of limitedSentences) {
            try {
                console.log('Translating Sentence:', sentence);
                const translatedSentence = await translate(sentence.trim());
                console.log('Translated Sentence:', translatedSentence);
                sentences.push(translatedSentence);
            } catch (e) {
                console.error(e);
            }
        }
    }
    console.log('Sentences:', sentences);

    let keywords = [];

    for (let sentence of sentences) {
        console.log('Generating keywords for sentence:', sentence);
        let keywords_in_sentence = await generate_topic(sentence);
        console.log('Keywords in sentence:', keywords_in_sentence);
        keywords.push(keywords_in_sentence);
    }

    let topic = keywords.join(', ');

    console.log("KEYWORDS:", keywords);

    chrome.runtime.sendMessage({
        action: "get_topic_embedding",
        topic: topic
    }, async (response) => {
        let topic_embedding = response;

        console.log("Topic embedding:", topic_embedding);

        relevant_topics = await get_relevant_topics(topic_embedding);

        console.log("Relevant topics:", relevant_topics);

        // Take the top 5 topics
        const top_relevant_topics = [];

        // Generate questions for each of the top 5 topics
        for (let topic of relevant_topics.slice(0, 5)) {
            try {
                if (topic.cosine_similarity < 0.4) {
                    continue;
                }
                topic.voting_score = 0;
                let generated_question = await generate_questions_for_actionable(topic.title + '\n\n' + topic.description);
                console.log("Generated question for topic:", generated_question);
                topic.questionToShow = generated_question;
                top_relevant_topics.push(topic);
            }
            catch (e) {
                console.error(e);
            }
        }

        console.log("Top 5 relevant topics:", top_relevant_topics);

        show_dialog(top_relevant_topics);
    });
}

if (is_news_website()) {
    console.info('This is a news website');

    // Try to create a session when the content script is loaded
    try {
        window.ai.languageModel.create(DEFAULT_PARAMS).then((created_session) => {
            session = created_session;
            console.log('Session created');
            return process_articles();
        }).then(console.log);
    } catch (e) {
        console.error(e);
    }
}

// UI

function changeDialogContent(content) {
    const dialogContainer = document.querySelector('.alr-dmc-content');
    dialogContainer.innerHTML = content;
}

function show_initiatives(initiatives) {
    changeDialogContent(dialogInitiativesHTML);
    // For each initiative, create a an element based on the initiativeBoxHTML template
    const initiativesContainer = document.querySelector('.alr-dmc-initiatives-container');
    for (let initiative of initiatives) {
        const initiativeBox = document.createElement('div');
        initiativeBox.innerHTML = initiativeBoxHTML;
        initiativeBox.querySelector('.alr-dmc-initiative-title').textContent = initiative.original_title ?? initiative.title;
        initiativeBox.querySelector('.alr-dmc-initiative-description').textContent = initiative.original_description ?? initiative.description;
        initiativeBox.querySelector('.alr-dmc-initiative-action').href = initiative.semantic_vector_url;
        initiativesContainer.appendChild(initiativeBox);
    }
    document.querySelector('.alr-dmc-actions').innerHTML = '';
}

function show_dialog(questions_to_show) {
    if (questions_to_show.length === 0) {
        console.error("No questions to show");
        return;
    }

    document.head.appendChild(style);

    var currentQuestion = 0;

    const dialogContainer = document.createElement('div');
    dialogContainer.innerHTML = dialogHTML;

    // Detect when the dialogContainer is in the middle of the screen
    window.onscroll = () => {
        const dialogContainer = document.querySelector('.alr-dmc-modal-center');
        
        // Make the opaqueness of the overlay depend on the linear distance in both directions to the middle of the screen
        const overlay = document.querySelector('.alr-dmc-overlay');
        overlay.style.opacity = 1 - Math.abs(dialogContainer.getBoundingClientRect().top - window.innerHeight / 2) / (window.innerHeight / 2);
    }

    // If possible, append the dialog to whatever is after the <article> tag
    const article = document.querySelector('article');
    if (article) {
        console.info("Appending dialog after article");
        article.after(dialogContainer);
    }
    else {
        console.info("Article not found. Appending dialog to body");
        document.body.appendChild(dialogContainer);
    };

    const closeButton = document.getElementById('alr-dmc-closeButton');
    const agreeButton = document.getElementById('alr-dmc-agreeButton');
    const disagreeButton = document.getElementById('alr-dmc-disagreeButton');
    const skipButton = document.getElementById('alr-dmc-skipButton');

    // Event listeners for closing the modal
    closeButton.addEventListener('click', hide_dialog);

    const goToNextQuestion = () => {
        currentQuestion++;
        if (currentQuestion >= questions_to_show.length) {
            // Close if all the questions have score === 0
            if (questions_to_show.every(question => question.voting_score === 0)) {
                hide_dialog();
            } else {
                // Change the content to the list of initiatives that have a score !== 0
                const initiatives_to_show_to_user = questions_to_show.filter(question => question.voting_score !== 0);
                show_initiatives(initiatives_to_show_to_user);
            }
            // changeDialogContent(dialogEmptyHTML);
        } else {
            changeDialogQuestion(questions_to_show[currentQuestion]);
        }
    }

    // Event listener for the agree button: increase the voting score of the current topic
    agreeButton.addEventListener('click', () => {
        confetti("tsparticles", {
            particleCount: 100,
            spread: 70,
            // position: {
            //     // the coordinates of the button
            //     x: agreeButton.getBoundingClientRect().left + agreeButton.offsetWidth / 2,
            //     y: agreeButton.getBoundingClientRect().top + agreeButton.offsetHeight / 2
            // },
            position: {
                x: 50,
                y: 50,
            },
            // Use emojis as particles
            shapes: ["emoji"],
            shapeOptions: {
              emoji: {
                value: ["👍"],
                },
            },
            zIndex: 100,
        });
        questions_to_show[currentQuestion].voting_score++;
        goToNextQuestion();
    });

    // Event listener for the disagree button: decrease the voting score of the current topic
    disagreeButton.addEventListener('click', () => {
        confetti("tsparticles", {
            particleCount: 100,
            spread: 70,
            // position: {
            //     // the coordinates of the button
            //     x: agreeButton.getBoundingClientRect().left + agreeButton.offsetWidth / 2,
            //     y: agreeButton.getBoundingClientRect().top + agreeButton.offsetHeight / 2
            // },
            position: {
                x: 50,
                y: 50,
            },
            // Use emojis as particles
            shapes: ["emoji"],
            shapeOptions: {
              emoji: {
                value: ["👎"],
                },
            },
            zIndex: 100,
        });
        questions_to_show[currentQuestion].voting_score--;
        goToNextQuestion();
    }
    );

    // Event listener for the skip button: skip to the next question
    skipButton.addEventListener('click', goToNextQuestion);

    // Display the first question
    changeDialogQuestion(questions_to_show[currentQuestion]);

    return dialogContainer;
}

function changeDialogQuestion(question) {
    const statement = document.getElementById('alr-dmc-dialogStatement');
    statement.textContent = question.questionToShow;

    const learnMoreQuote = document.querySelector('.alr-dmc-learn-more-quote');
    const learnMoreContent = document.querySelector('.alr-dmc-learn-more-content');

    learnMoreContent.innerHTML =  `This is being shown because there is an action item you might be interested in:<br><br><b style="font-weight: 600;">${question.title}</b><br><br>${question.description}`;;
    learnMoreContent.innerHTML += `<div class="alr-dmc-learn-more-copyright">Powered by ALR DMC</div>`;
    
    learnMoreQuote.onclick = () => {
        const learnMoreContent = document.querySelector('.alr-dmc-learn-more-content');
        learnMoreContent.classList.toggle('alr-dmc-learn-more-content-visible');
    }
}

function hide_dialog() {
    const dialogContainer = document.querySelector('.alr-dmc-modal-center');
    console.log("Dialog container:", dialogContainer);
    if (dialogContainer) {
        dialogContainer.remove();
    }
}

const dialogHTML = `
 <div class="alr-dmc-modal-center">
 <div class="alr-dmc-overlay"></div>
 <div class="alr-dmc-container">
    <div class="alr-dmc-header">
      <div class="alr-dmc-header-brand">What do you think?</div>
      <button type="button" class="alr-dmc-close-button" id="alr-dmc-closeButton">×</button>
    </div>
    <div class="alr-dmc-content">
<div class="alr-dmc-quote-container">
      <div class="alr-dmc-quote-mark">❝</div>
      <p class="alr-dmc-quote" id="alr-dmc-dialogStatement">
      </p>
    </div>
<div class="alr-dmc-learn-more-container">
      <p class="alr-dmc-learn-more-quote">Why this question?</p>
      <div class="alr-dmc-learn-more-content"></div>
    </div>
  </div>
    
    <div class="alr-dmc-actions">
      <button class="alr-dmc-action-button" id="alr-dmc-agreeButton">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>
      
      <div class="alr-dmc-divider"></div>
      
      <button class="alr-dmc-action-button" id="alr-dmc-disagreeButton">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
        </svg>
      </button>
      
      <div class="alr-dmc-divider"></div>
      
      <button class="alr-dmc-action-button" id="alr-dmc-skipButton">
        Skip
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    </div>
    </div>
    <!--
    <div class="alr-dmc-footer">
    </div>
    -->
</div>
`;

const dialogInitiativesHTML = `
<h1 class='alr-dmc-title'>You can take action!</h1>
<h2 class='alr-dmc-subtitle'>Want to get involved? Check this out 👀</h2>
<div class="alr-dmc-initiatives-container">
</div>
`;

// Contains a title, a description, and a button to take action with an arrow icon
const initiativeBoxHTML = `
<div class="alr-dmc-initiative-box">
    <h2 class="alr-dmc-initiative-title">The Paradox of the 2020 Presidential</h2>
    <p class="alr-dmc-initiative-description">Test</p>
    <a class="alr-dmc-action-button alr-dmc-initiative-action" target="_blank">Take action</a>
</div>
`;

const dialogEmptyHTML = `
    <p class="alr-dmc-quote">No more initiatives</p>
`;

const style = document.createElement('style');

// Dialog displayed in the center of the screen
style.textContent = `
.alr-dmc-title { 
    font-size: 25px;
    margin-bottom: 12px;
    font-weight: 800;
}

.alr-dmc-subtitle {
    font-size: 20px;
    margin-bottom: 20px;
}

.alr-dmc-initiatives-container {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: start;
    overflow-x: auto;
    gap: 20px;
    padding: 8px;
}

.alr-dmc-initiatives-container::-webkit-scrollbar{
    border-radius: 10px;
    }

.alr-dmc-modal-center {
    display: flex;
    justify-content: center;
    margin-top: 50px;
}    

.alr-dmc-initiatives-container::-webkit-scrollbar-thumb {
    height: 4px;
    background: black;
    border-radius: 10px;
    }

.alr-dmc-initiatives-container::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
}

.alr-dmc-initiative-box {
    display: flex;
    flex-direction: column;
    align-items: start;
    justify-content: start;
    text-align: start;
    gap: 10px;
    border: 1px solid #000000;
    padding: 10px;
    flex-wrap: wrap;
    min-width: 200px;
}

.alr-dmc-initiative-title {
    font-size: 20px;
    font-weight: 800;
}

.alr-dmc-initiative-description {
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
}

.alr-dmc-content {
    text-align: start;
    padding: 20px;
}

.alr-dmc-container {
    font-family: 'Open sans', 'Arial', 'Helvetica', sans-serif !important;
    width: 90%;
    max-width: 600px;
    background: white;
    border-radius: 2;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    animation: alr-dmc-appear 0.3s ease;
    border: 3px solid;
    z-index: 102;
}

@keyframes alr-dmc-appear {

    from {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0;
    }

    to {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}

    .alr-dmc-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.3);
      z-index: 101;
    }

  .alr-dmc-close-button {
    position: absolute;
    right: 15px;
    top: 12px;
    font-size: 20px;
    color: #ffffff;
    background: none;
    border: none;
    cursor: pointer;
  }

    .alr-dmc-quote-container {
        position: relative;
        margin: 20px;
    }

    .alr-dmc-quote-mark {
        position: absolute;
        left: 0;
        top: 5px;
        font-size: 38px;
        color: #000000;
    }

    .alr-dmc-learn-more-quote {
        font-style: italic;
        color: gray;
    }

    .alr-dmc-learn-more-copyright {
        font-style: italic;
        color: gray;
        margin-top: 20px;
    }

    .alr-dmc-learn-more-quote:hover {
        color: black;
        cursor: pointer;
        transition: color 0.3s ease;
    }

    .alr-dmc-learn-more-content {
        height: 0;
        overflow: hidden;
        margin-top: 15px;
        color: gray;
    }

    .alr-dmc-learn-more-content-visible {
        height: auto;
    }

    .alr-dmc-quote {
        font-size: 24px;
        line-height: 1.3;
        margin-left: 40px;
        margin-right: 40px;
    }

    .alr-dmc-actions {
        display: flex;
        justify-content: space-around;
        padding: 15px;
        background: #000000;
        border-top: 1px solid #ffffff;
    }

  .alr-dmc-action-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    color: #ffffff;
    text-decoration: none;
    padding: 10px;
    flex: 1;
    border: none;
    background: #000000;
    cursor: pointer;
    margin-right: 5px;
    margin-left: 5px;
    text-transform: uppercase;
    font-weight: bold;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 10px;
  }

    .alr-dmc-action-button:hover {
        background: #ffffff;
        color: #000000;
        transition: background 0.3s ease;
    }

    .alr-dmc-action-button:active {
        background: #ffffff;
        color: #000000;
    }

  .alr-dmc-divider {
    width: 1px;
    background: #ffffff;
    margin: 20px 0;
    visibility: hidden;
  }
  
  .alr-dmc-header {
    display: flex;
    align-items: flex-start;
    padding: 15px;
    position: relative;
    background: black;
    color: white;
  }

  .alr-dmc-footer {
    position: relative;
    padding: 15px;
    background: #FF0000;
    color: white;
    text-align: center;
    font-size: small;
  }

  .alr-dmc-header-brand {
    font-weight: bold;
  }

  .alr-dmc-settings-icon {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 20px;
  }
`;
/*
 show_dialog([
     {
         title: "The Paradox of the 2020 Presidential",
         description: "Test",
         questionToShow: "Test",
         voting_score: 0,
         semantic_vector_url: "https://www.example.com",
     },
     {
         title: "The Paradox of the 2024 Presidential",
         description: "Test",
         questionToShow: "Test",
         voting_score: 0,
         semantic_vector_url: "https://www.example.com",
     },
     {
         title: "The Paradox of the 2028 Presidential",
         description: "Test",
         questionToShow: "Test",
         voting_score: 0,
         semantic_vector_url: "https://www.example.com",
     },
 ]);
 */