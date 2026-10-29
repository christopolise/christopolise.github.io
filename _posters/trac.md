---
title: "T.R.A.C. Air: Traffic-camera Real-time Analysis for Clean Air"
authors: Jason Rao, <b>Christopher Kitras</b>, Philip Lundrigan
venue: For the Benefit of the World Conference, BYU, 2025
year: 2025
link: assets/trac-2025.pdf
link_label: Poster
fig: trac-hourly
fig_aspect: 16/9
fig_label: "Left: a traffic-camera image and the weather at that moment (visibility, cloud cover, description) feed Gemma 3 with 4 billion parameters, LoRA-tuned on 10,000 camera images, beside two quotes from its prompt. Right: the model's PM2.5 estimates for one camera on May 5, 2025, four images per hour from 08:00 to 18:00, scattered between 1.1 and 11.0 micrograms per cubic meter. Each hour's four estimates merge into their mean, and the hourly means are drawn as a line beside the nearby state station's hourly PM2.5, which runs between 3.7 and 6.0. A readout gives the poster's RMSE of 0.76 micrograms per cubic meter over four days."
fig_caption: "<strong>From one prompted image to an hourly value.</strong> Each camera image goes to Gemma 3 (4B, LoRA-tuned) with the weather of that moment, and the prompt asks for a PM2.5 number. An hour's estimates are averaged and compared with a state station about 1 km away; the values are read from the poster's chart for May 5, 2025, with the hourly means and station values drawn at mid-hour. The 0.76 µg/m³ RMSE is the poster's figure for four days. Use <em>Show per-image only</em> to see the raw estimates without averaging."
fig_illustrative: false
about: "Utah County has only two government air-quality stations, and privately owned PurpleAir sensors leave lower-income areas with less coverage. T.R.A.C. Air prompts Google's open multimodal LLM, Gemma 3 with 4 billion parameters, with a traffic-camera image and the weather at that moment to estimate PM2.5, after instruction-tuning it with LoRA on 10,000 camera images. Averaging an hour of per-image estimates for one camera over four days gave an RMSE of 0.76 µg/m³ against a nearby state sampling station, better than prior work with traditional machine learning."
---
