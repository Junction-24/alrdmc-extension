import { cos_sim } from '@xenova/transformers';

const DEFAULT_PARAMS = {
    // temperature: 1.0,
    // topK: 5
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
}

async function generate_questions_for_actionable(text) {
    try {
        const questionsGeneratorSession = await window.ai.languageModel.create({
            ...DEFAULT_PARAMS,
            initialPrompts: [
                { role: "system", content: "Generate a one-phrase debate idea for a debate about a topic given by the user. The idea should be open-ended and should not be biased." },
                {
                    role: "user", content: `TOPIC: ## The Paradox of the 2020 Presidential Election: Gender, Economy, and Women's Votes

While Kamala Harris' candidacy sparked historic excitement and marked a milestone in American politics, her victory was not as decisive or impactful as some had anticipated. This article explores the complex interplay of factors that contributed to this outcome. It delves into the contrasting views on female leadership, particularly in relation to the presidency, and examines how the state of the economy, a crucial consideration for most voters, influenced their decisions. By examining both sides of this seemingly paradoxical issue, the article aims to provide a nuanced understanding of the 2020 election's outcomes and their broader implications for gender equality and the evolution of political power in America.`
                },
                { role: "assistant", content: "Gender equality should be made a priority." },
                {
                    role: "user", content: `## Topic Description: Northern Spain Flooded but No Casualties

**Flooding in Northern Spain:** A recent period of heavy rainfall caused significant damage and disruptions to transportation in the northern region of [mention specific region, e.g., Galicia, Asturias].  While the flooding resulted in [mention specific damage caused, e.g., widespread flooding of roads and infrastructure, landslides, damage to crops], authorities reported no fatalities. The event highlighted the vulnerability of the region to extreme weather events and the importance of [mention relevant measures taken, e.g., flood defenses, emergency preparedness, disaster response]. The article likely delves into the details of the flooding, its impacts on various sectors, and the lessons learned from the incident regarding disaster management and infrastructure resilience.`
                },
                { role: "assistant", content: "Spain's regional vulnerability to extreme weather events is a cause for concern." },
            ]
        });

        return questionsGeneratorSession.prompt(text);
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

        relevant_topics = await get_relevant_topics(topic_embedding);

        console.log("Relevant topics:", relevant_topics);

        // Take the top 5 topics
        const top_relevant_topics = [];

        // Generate questions for each of the top 5 topics
        for (let topic of relevant_topics.slice(0, 5)) {
            try {
                if (topic.cosine_similarity > 0.7) {
                    top_relevant_topics.push(topic);
                }
                topic.voting_score = 0;
                let generated_question = await generate_questions_for_actionable(topic.title + '\n' + topic.description);
                console.log("Generated question for topic:", generated_question);
                topic.questionToShow = generated_question;
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

    const closeButton = document.getElementById('closeButton');
    const agreeButton = document.getElementById('agreeButton');
    const disagreeButton = document.getElementById('disagreeButton');
    const skipButton = document.getElementById('skipButton');

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
            changeDialogText(questions_to_show[currentQuestion].questionToShow);
        }
    }

    // Event listener for the agree button: increase the voting score of the current topic
    agreeButton.addEventListener('click', () => {
        questions_to_show[currentQuestion].voting_score++;
        goToNextQuestion();
    }
    );

    // Event listener for the disagree button: decrease the voting score of the current topic
    disagreeButton.addEventListener('click', () => {
        questions_to_show[currentQuestion].voting_score--;
        goToNextQuestion();
    }
    );

    // Event listener for the skip button: skip to the next question
    skipButton.addEventListener('click', goToNextQuestion);

    // Display the first question
    changeDialogText(questions_to_show[currentQuestion].questionToShow);

    return dialogContainer;
}

function changeDialogText(text) {
    const statement = document.getElementById('dialogStatement');
    statement.textContent = text;
}

function hide_dialog() {
    const dialogContainer = document.querySelector('.modal-center');
    console.log("Dialog container:", dialogContainer);
    if (dialogContainer) {
        dialogContainer.remove();
    }
}

const dialogHTML = `
 <div class="modal-center">
 <div class="overlay"></div>
 <div class="container">
    <div class="header">
      <div class="header-brand">ALR DMC</div>
      <button type="button" class="close-button" id="closeButton">×</button>
    </div>
    <div class="alr-dmc-content">
<div class="quote-container">
      <div class="quote-mark">❝</div>
      <p class="quote" id="dialogStatement">
      </p>
    </div>
    
    <div class="actions">
      <button class="action-button" id="agreeButton">
        Agree
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>
      
      <div class="divider"></div>
      
      <button class="action-button" id="disagreeButton">
        Disagree
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
        </svg>
      </button>
      
      <div class="divider"></div>
      
      <button class="action-button" id="skipButton">
        Pass
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    </div>
    </div>
    <!--
    <div class="footer">
    </div>
    -->
  </div>
</div>
`;

const dialogInitiativesHTML = `
 <div class="modal-center">
 <div class="overlay"></div>
 <div class="container">
    <div class="header">
      <div class="header-brand">ALR DMC</div>
      <button type="button" class="close-button" id="closeButton">×</button>
    </div>
    <div class="content">
<div class="quote-container">
      <div class="quote-mark">❝</div>
      <p class="quote" id="dialogStatement">
      </p>
    </div>
    
    <div class="actions">
      <button class="action-button" id="agreeButton">
        Agree
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>
      
      <div class="divider"></div>
      
      <button class="action-button" id="disagreeButton">
        Disagree
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
        </svg>
      </button>
      
      <div class="divider"></div>
      
      <button class="action-button" id="skipButton">
        Pass
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      </button>
    </div>
    </div>
    <!--
    <div class="footer">
    </div>
    -->
  </div>
</div>
`;

const dialogEmptyHTML = `
    <p class="quote">No more initiatives</p>
`;

const style = document.createElement('style');

// Dialog displayed in the center of the screen
style.textContent = `

.content {
    text-align: center;
}

.container {
    font-family: 'Open sans', 'Arial', 'Helvetica', sans-serif;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90%;
    max-width: 600px;
    background: white;
    border-radius: 2;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    z-index: 1000;
    animation: appear 0.3s ease;
    border: 3px solid;
}

@keyframes appear {

    from {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0;
    }

    to {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
    }
}

    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.3);
      z-index: 999;
    }

  .close-button {
    position: absolute;
    right: 15px;
    top: 12px;
    font-size: 20px;
    color: #ffffff;
    background: none;
    border: none;
    cursor: pointer;
  }

  .quote-container {
    position: relative;
    margin: 20px;
  }

  .quote-mark {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 24px;
    color: #666;
  }

  .quote {
    font-size: 24px;
    line-height: 1.3;
    margin-left: 40px;
  }

  .actions {
    display: flex;
    justify-content: space-around;
    padding: 15px;
    background: #000000;
    border-top: 1px solid #ffffff;
  }

  .action-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    color: #000000;
    text-decoration: none;
    padding: 10px;
    flex: 1;
    border: none;
    background: #ffffff;
    cursor: pointer;
    margin-right: 5px;
    margin-left: 5px;
    /* text in all caps */
    text-transform: uppercase;
    font-weight: bold;
    /* Children in a row, centered horizontally */
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 10px;
  }

    .action-button:hover {
        background: #000000;
        color: #ffffff;
        transition: background 0.3s ease;
    }

    .action-button:active {
        background: #000000;
        color: #ffffff;
    }

  .divider {
    width: 1px;
    background: #ffffff;
    margin: 20px 0;
    visibility: hidden;
  }
  
  .header {
    display: flex;
    align-items: flex-start;
    padding: 15px;
    position: relative;
    background: black;
    color: white;
  }

  .footer {
    position: relative;
    padding: 15px;
    background: #FF0000;
    color: white;
    text-align: center;
    font-size: small;
  }

  .header-brand {
    font-weight: bold;
  }

  .settings-icon {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 20px;
  }
`;

show_dialog([
    {
        title: "The Paradox of the 2020 Presidential",
        description: "Test",
        questionToShow: "Test",
        voting_score: 0,
    }]);