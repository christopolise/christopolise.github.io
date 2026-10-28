---
title: Music Generation with Direct Policy Optimization
authors: Shad Torrie, Dallin Miner, <b>Christopher Kitras</b>
venue: 'CS 673: Computational Creativity, Brigham Young University'
year: 2024
figure: assets/rlhf.png
link: assets/Music_Generation_and_RLHF.pdf
links:
- text: Presentation
  url: assets/rlhf_pres.pdf
  note: Class presentation slides
link_label: Report
fig: music-dpo
fig_aspect: 16/9
fig_label: A chosen and a rejected song from the same genre pass through MusicGen's decoder, whose first 12 layers are frozen. Training raises the chosen song's likelihood relative to a frozen reference and lowers the rejected one's; the gap is the margin. Swapping the pair trains the negative model.
fig_caption: <strong>One preference pair at a time.</strong> Both songs run through MusicGen's decoder. Only the last 12 of its 24 layers change; the first 12 stay frozen so the model keeps what it knows about music. Training raises how likely the model finds the chosen song, compared with the frozen original, and lowers it for the rejected one. The gap is the <em>margin</em>. Swap the pair to train the negative model for the same metric. The songs, values, and steady growth of the margin are invented for clarity; in our real runs most margins barely moved.
fig_illustrative: true
abstract: Music is a fundamental creative outlet that allows humans to express themselves meaningfully. However, not every human who has the desire to express themselves through music has the skill set to do so effectively. MusicGen is a music generation model that allows anyone to input a text or audio prompt and receive a generated piece of music as output. In this paper, we present a system that allows a potential music composer to utilize MusicGen more intentionally. We enable the user with even more control over the generation of their musical piece by training the MusicGen model against a reward model optimized for certain aspects such as danceability, valence, etc. We accomplish this by using a Spotify Research dataset to train MusicGen with Direct Preference Optimization. We evaluate the success of our work through a set of tests that will determine the variety of the music generated, the compliance of creating music according to the specified parameter configuration given, and the
  accuracy of our customized models.
---
