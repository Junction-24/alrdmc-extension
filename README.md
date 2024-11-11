# ALR DMC
ALR DMC is a browser extension that helps users take action on the issues they care about. It does this by detecting when users are reading about topics they can take action on.

# How to run ALR DMC
1. You will need to have Chrome Beta installed.
2. Enable the AI Origin Trial Launch Chrome with the following flag, which makes sure the origin trial token in manifest.json is accepted by the browser. This is required because the APIs used are in the experimental stage. Use this origin trial token: `--origin-trial-public-key='Apfl6x2Z35Br0a4M1gwrM1eG/ePzpcnscWu28dOWnfB1OM6Fp3cgTQYwn5CO+0YFIp6yGPRJhidxgfmfnYrDgQwAAAB4eyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vb2VuYW1tbWhsb2VrbGFubmZuZ2NjbGpjZWhna2RmaWsiLCJmZWF0dXJlIjoiQUlQcm9tcHRBUElGb3JFeHRlbnNpb24iLCJleHBpcnkiOjE3NjA0ODYzOTl9'`
3. Then, load this directory directly as an unpacked extension.
4. It should work out of the box!

(Credits for install instructions: https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/ai.gemini-on-device)

# About ALR DMC
## Inspiration
The advent of technology has democratized information, yet young people are not using it to take action. Why?

We are convinced that this is not due to a lack of interest, but rather to a lack of [opportunities](https://doi.org/10.1017/gov.2023.16) to engage. For example, Sarah (24 y/o) often reads online news articles, but mentioned that she doesn't think about participating in discussions about the topics she reads about.

## What it does
This is where ALR DMC comes in. We want to help people naturally build the habit of taking action on the issues they care about. There's been attempts before, but they were politized, complex, or boring.

Our idea is effective because it is simple. We built a browser extension that detects when users are reading about topics they can take action on by using platforms like [Kansalaisaloite](https://www.kansalaisaloite.fi/fi) or [Change.org](https://www.change.org/). For example, after reading an article about the floods in Spain, the user may see a pop-up asking them "Should we start preparing for more climate change-related disasters?".

This is how we bridge the gap between information and action.

## How we built it
- **User Research**: We conducted 78 interviews (see annex).
- **Chrome AI**: We applied for the early preview of a set of experimental Chrome APIs exposing access to Gemini Nano, running directly on the user's device. We toyed with the Summarization, Translation, Writing and Language Detection APIs before settling on the Prompt API, more capable. These APIs were not fully documented and had several bugs. Also, using experimental features means we can't publish the extension (it can't run elsewhere).
- **Frontend Workload**: A big concern for us was user privacy. We wanted to avoid sending their browsing data to our servers. So we moved most of the workload to the frontend (see annex).

## Challenges and accomplishments we're proud of
- **AI Bias Avoidance**: In order to steer clear of it, we adopted a neuro-symbolic approach. Instead of having the AI make decisions on its own, we confine its action space to a set of predefined ones. Our worst-case scenario would be to offer the user low-quality actions when the model generates incorrect keywords, which is not so harmful per se.
- **Suboptimal client-side libraries**: We had to do most work on the frontend, and JS libraries lacked features and documentation. For instance, a `Tensor` doesn't expose a division method, so we needed to do `multiplication(1/x)`.
- **Pollers**: We had to build scrapers for the platforms we wanted to support. This was time-consuming and we had to refine our approach multiple times.

## What's next
- **Polis integration**: We want to integrate with [Polis](https://pol.is/) to relay the user's vote to the platform. We would need to find a way to do so without compromising user privacy.
- **Mobile support**: We want to extend our extension to mobile devices, after the Chrome AI APIs make their way to mobile.
