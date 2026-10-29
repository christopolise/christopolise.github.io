---
title: "TCAM: Traffic-Camera-Based Air Quality Monitoring Using Multimodal Large Language Models"
authors: Jason Rao, <b>Christopher Kitras</b>, Dah-Jye Lee, Philip Lundrigan
venue: Utah AI Convergence, University of Utah, 2026
year: 2026
link: assets/tcam-mllm-2025.pdf
link_label: Poster
fig: tcam-mllm-physics
fig_aspect: 16/9
fig_label: "Animated figure in two parts. First, a traffic-camera frame that looks hazy gets a wide, uncertain PM2.5 reading. Five physics-guided indicators (visibility level, wind dispersion, weather obstruction risk, nighttime stagnation risk and haze source hypothesis) light up one by one from the weather data, each leaning toward pollution or toward weather or low light, and the estimate narrows to one value. The scene cycles through fog, pollution haze and low light. Second, a map of the eight Utah test cities, three seen in training and five unseen, beside a strip per city showing every model's mean absolute error, with PGML-TCAM at or near the lowest error in most cities, followed by its summary results."
fig_caption: "<strong>Haze or fog?</strong> A hazy camera frame on its own gives an ambiguous PM2.5 reading. PGML-TCAM's physics-guided indicators, computed from wind, humidity and cloud cover, lean toward pollution (terracotta) or toward weather and low light (blue), and its estimate (teal) settles; the <em>Show</em> button switches the scene between fog, pollution haze and low light. The second part plots each city's MAE for every model, read from the poster's per-city chart, with the poster's summary: PGML-TCAM had the best correlation, MAE and MAPE across all eight cities (RMSE tied) and the strongest transferability (0.926) on the five unseen ones. The scenes, the weather and indicator values and the PM2.5 estimates are illustrative."
fig_illustrative: true
about: "Image models trained on one traffic camera tend to learn that camera's quirks and fail at new locations. This version of TCAM fine-tunes multimodal LLMs with LoRA on camera images plus weather, and its physics-guided variant, PGML-TCAM, adds indicators for visibility, wind dispersion, weather obstruction, nighttime stagnation and haze source so the model can tell pollution haze from fog, rain, clouds and low light. On 22,387 images from eight Utah cities, five of them unseen in training, PGML-TCAM had the best overall balance of error and correlation and the strongest transferability score (0.926) among the CNN and MLLM models tested."
---
