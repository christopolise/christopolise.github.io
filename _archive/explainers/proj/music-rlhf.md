---
title:  "Music Generation with Direct Policy Optimization"
short_title: "Music generation with DPO"
summary: "Text-to-music models leave everything beyond the prompt to chance. We fine-tuned Meta's MusicGen on pairs of real songs to push qualities like danceability or energy up or down, and built sliders that blend the resulting models."
authors: Shad Torrie, Dallin Miner, <b>Christopher Kitras</b>
venue: "CS 673: Computational Creativity, Brigham Young University"
venue_short: "CS 673, BYU"
year: 2024
figure: assets/rlhf.png
link: assets/Music_Generation_and_RLHF.pdf
link_label: "Read the report"
links:
  - text: "Presentation"
    url: assets/rlhf_pres.pdf
    note: "Class presentation slides"
fig_scripts: [music-dpo, music-mix]
short:
  - label: "The goal"
    text: "Music generators like MusicGen turn a short text prompt into a song, but everything the prompt doesn't say is left to chance. We wanted to give a composer controls for qualities like danceability, energy, or tempo."
  - label: "What we built"
    text: "We fine-tuned MusicGen into 26 versions, one pushed toward and one pushed away from each of 13 qualities, by showing it pairs of real songs. A web app with a slider per quality blends those versions into one model."
  - label: "How it went"
    text: "Mixed. Most fine-tuned models matched the text prompt better than the original by an automatic score, but they barely learned the qualities themselves, and limited computing time forced a much smaller dataset than planned."
---

## More control than a prompt

MusicGen, from Meta, is a transformer that turns a text or audio prompt into a piece of music. It lets people without musical training make something, but the prompt is the only control. Everything else about the result comes from the randomness of the model. That works for a one-off clip and gets in the way of someone trying to compose on purpose.

Our project for CS 673 gave the user more handles. We fine-tuned MusicGen so that a specific quality of the output, such as danceability or valence, could be turned up or down, and built an interface where each quality has its own slider next to the usual text box.

## Learning from pairs of songs

The usual way to steer a generative model toward what people prefer is reinforcement learning from human feedback (RLHF): train a separate reward model on preference data, then use it to train the main model. We used Direct Preference Optimization (DPO), the method of Rafailov et al. (2023), which removes the reward model. The model is shown a pair, one example *chosen* and one *rejected*, and trained directly to favor the chosen one. That halves the number of models to train.

Preference data usually comes from people labeling which of two outputs is better. We used existing measurements instead, as if a person had labeled each pair. Our first attempt used the MusicCaps dataset with YouTube likes, views, and comments, but we could not train a reward model on those numbers; we suspect they described the videos more than the audio, since many clips were things like commercials or guitar lessons. We switched to the Kaggle *Spotify Tracks Genre* dataset: 114,000 tracks in 125 genres, about 62,700 after removing duplicates and dead links. For each track we downloaded the 30-second Spotify preview, collected the artist's genres, and searched YouTube for the song to add its statistics.

That gave 13 metrics to train on: popularity, danceability, energy, speechiness, acousticness, instrumentalness, liveness, valence, and tempo from Spotify, and interactions per thousand views, like/dislike ratio, view count, and rating from YouTube. To form pairs, each song was matched with its closest neighbor in genre space, so the two were musically comparable. For each metric, one song of the pair became the winner (chosen) and the other the loser (rejected).

{% include fig.html id="music-dpo" aspect="16/9" illustrative=true label="A chosen and a rejected song from the same genre pass through MusicGen's decoder, whose first 12 layers are frozen. Training raises the chosen song's likelihood relative to a frozen reference and lowers the rejected one's; the gap is the margin. Swapping the pair trains the negative model." caption="<strong>One preference pair at a time.</strong> Both songs run through MusicGen's decoder. Only the last 12 of its 24 layers change; the first 12 stay frozen so the model keeps what it knows about music. Training raises how likely the model finds the chosen song, compared with the frozen original, and lowers it for the rejected one. The gap is the <em>margin</em>. Swap the pair to train the negative model for the same metric. The songs, values, and steady growth of the margin are invented for clarity; in our real runs most margins barely moved." %}

Matching on genre had a side effect we noted at the time: the nearest song is often by the same artist, which makes the pairs very similar and the metric hard to learn.

## Making DPO work on music

We built on Hugging Face's TRL `DPOTrainer`, which is written for text-to-text models. MusicGen takes text and audio and produces audio, so the trainer needed real changes: a custom tokenizer that meshes the T5 text tokens of the prompt with the tokenized audio, a new padded data collator, and extensive shape changes to handle MusicGen's four audio codebooks. We also pre-tokenized the audio once rather than every epoch, and precomputed the reference model's log probabilities to save time and GPU memory.

Two choices limited how far fine-tuning could pull the model. We froze the first layers of the decoder (12 of 24 in our final runs), since MusicGen already knows what music is and how prompts relate to it, and we only wanted to adjust the end result. We also trained with parameter-efficient fine-tuning (PEFT) through LoRA, which cuts training time and storage with little cost to results.

Each of the 13 metrics got two models: a normal one, and a negative one trained on the same pairs with chosen and rejected swapped. All 26 trained on the BYU supercomputer, each job on one GPU with 12 CPU cores and 120 GB of memory, with a batch size of 3, a learning rate of 10<sup>−8</sup>, 150 warmup steps, and 10 epochs.

Compute shaped the dataset more than we wanted. The full set was 250,000 training pairs, five per song, and could not finish a single epoch within the cluster's 24-hour limit. Cutting to one pair per song was not enough either, so we kept only genres and artist subgenres containing the word "pop", leaving 12,500 pairs.

## Sliders that blend models

The interface is a Flask server with a Bootstrap front end: a text box for the prompt plus a slider from −5 to 5 for each of the 13 metrics. The server writes the request to a directory shared with a remote machine with the computing power to generate. That machine produces two songs with the same random seed, one from the slider-blended model and one from the base MusicGen, and returns both so the user can compare.

The blend is a weighted average of model weights. A positive slider mixes in the model trained to encourage that metric, a negative one the model trained to discourage it. The base model always joins with a value of 5, so that setting one slider to a small value nudges the base model instead of replacing it. Each model's weight is its slider's absolute value over the total:

<div class="eq"><var>w</var><sub><var>i</var></sub> = |<var>s</var><sub><var>i</var></sub>| / (5 + Σ<sub><var>j</var></sub> |<var>s</var><sub><var>j</var></sub>|), &nbsp; <var>w</var><sub>base</sub> = 5 / (5 + Σ<sub><var>j</var></sub> |<var>s</var><sub><var>j</var></sub>|)</div>

{% include fig.html id="music-mix" aspect="16/9" illustrative=true label="Sliders for Danceability, Energy and Acousticness beside a fixed base value of 5. Each model's weight is its slider's absolute value divided by the sum; a stacked bar shows the mixed model." caption="<strong>From sliders to one model.</strong> Energy and Acousticness move on their own; set Danceability yourself. A positive value brings in the model trained to encourage that metric, a negative value the one trained to discourage it, and the base model always counts as a 5. The weighting rule is the report's; the slider settings are examples, and the real interface has 13 sliders." %}

## How it went

We scored the models automatically with CLAP, which measures how well a piece of audio matches a text description. ChatGPT supplied 115 prompts of the form *genre, instrument, instrument, instrument*, close to the genre-only prompts in our training data. Every model, plus the base MusicGen, generated a clip for every prompt with the same random seed. We then asked two questions: does a model's music match a description of its metric (for example "danceable song" or "fast tempo song") better than the base model's, and does it still match the original prompt?

<dl class="results">
  <div><dt>fine-tuned models, a normal and a negative one per metric</dt><dd>26</dd></div>
  <div><dt>metrics where a fine-tuned model beat the base on its metric prompt</dt><dd>10 of 13</dd></div>
  <div><dt>training accuracy of most models (0.5 is chance)</dt><dd>~0.5</dd></div>
</dl>

On the metric prompts, a fine-tuned model scored above the base in 10 of the 13 metrics. But the negative models, trained to do the opposite, were as often the top scorers as the normal ones. Our best explanation is that the training songs had more of most qualities than MusicGen's original training data, so any fine-tuning on them moved the output in the same direction. Heat maps of every model against every metric prompt showed no clear pattern either, likely because many of the metrics are subjective and overlap.

<table>
  <thead><tr><th>Metric</th><th class="n">Base</th><th class="n">Normal</th><th class="n">Negative</th></tr></thead>
  <tbody>
    <tr><th>Energy</th><td class="n"><b>2.32</b></td><td class="n">2.12</td><td class="n">2.25</td></tr>
    <tr><th>Interactions per 1k views</th><td class="n">18.44</td><td class="n">17.85</td><td class="n"><b>18.56</b></td></tr>
    <tr><th>Liveness</th><td class="n">10.0</td><td class="n">10.3</td><td class="n"><b>10.9</b></td></tr>
    <tr><th>Acousticness</th><td class="n">4.62</td><td class="n"><b>5.27</b></td><td class="n">4.52</td></tr>
    <tr><th>Like/dislike ratio</th><td class="n">6.51</td><td class="n"><b>6.52</b></td><td class="n">5.46</td></tr>
    <tr><th>Popularity</th><td class="n">1.46</td><td class="n"><b>1.66</b></td><td class="n">1.52</td></tr>
    <tr><th>Instrumentalness</th><td class="n">19.24</td><td class="n"><b>23.41</b></td><td class="n">20.86</td></tr>
    <tr><th>Rating</th><td class="n"><b>2.12</b></td><td class="n">1.81</td><td class="n">1.84</td></tr>
    <tr><th>Danceability</th><td class="n">1.07</td><td class="n"><b>1.18</b></td><td class="n">0.96</td></tr>
    <tr><th>Valence</th><td class="n">18.32</td><td class="n">16.51</td><td class="n"><b>18.71</b></td></tr>
    <tr><th>Tempo</th><td class="n">13.95</td><td class="n">14.77</td><td class="n"><b>16.82</b></td></tr>
    <tr><th>View count</th><td class="n"><b>7.90</b></td><td class="n">7.11</td><td class="n">7.44</td></tr>
    <tr><th>Speechiness</th><td class="n">2.61</td><td class="n">3.02</td><td class="n"><b>3.31</b></td></tr>
  </tbody>
</table>

The training logs explain much of this. Most models' accuracy, the share of pairs where the model prefers the chosen song, stayed near 0.5 in both training and evaluation, and only a few passed 0.55. Some margins ended negative, meaning the model drifted the wrong way. Listening gave the same mixed picture: some metrics sounded right, others had little audible effect.

The second question went better. Against the original prompts, the base model scored 0.64; nine of the 13 normal models and eleven of the 13 negative models scored higher. Training on real, well-produced songs seems to have improved how closely the output followed the prompt, whichever direction the pairs pointed.

## What we'd take from it

Two things held the models back. The first was data: cutting to pop-only pairs removed whole genres, and a metric doesn't mean the same thing in every genre, since a popular lo-fi track sounds nothing like a popular metal one. The second was the metrics themselves. View count and rating depend heavily on things outside the audio, such as an artist's fame, and may not be learnable from sound at all.

Much of the remaining limit was compute and time. We found late that a leftover `torch.autograd.set_detect_anomaly()` call was holding training back: removing it sped training up by over 30% and let additional GPUs help, and that requesting 1 TB of memory per job, instead of 120 GB, had confined our jobs to a few nodes. Adapting the DPO trainer took longer than we planned, which left little time to tune learning rates and frozen layers, or to train the larger MusicGen models. The evaluation we most wanted and didn't get to was a human one: people listening and judging whether each slider does what it says.
