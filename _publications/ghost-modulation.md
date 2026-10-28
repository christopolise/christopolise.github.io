---
title: 'Hidden in Plain Sight: Communicating using Interference'
authors: Ashton Palacios, Daniel Harman, <b>Christopher Kitras</b>, Elle Kelsey, Mitchell C. Burnett, Willie K. Harrison, Philip Lundrigan
venue: IEEE International Symposium on Dynamic Spectrum Access Networks (DySPAN), 2025
year: 2025
figure: assets/gm.svg
link: assets/GM_v2.pdf
links:
- text: IEEE Xplore
  url: https://ieeexplore.ieee.org/document/11115916
  note: Published version
link_label: Paper
fig: ghost-modulation-sky
fig_aspect: 16/9
fig_label: Three LEO satellites, in teal, terracotta and blue, cross the sky above a radio telescope. Sat A's sidelobe sweeps over the dish and a burst of interference ruins the observation. From the burst's transmission timestamps alone, the observatory reads a one-time code that matches the current minute and an ID naming Sat A. In the replay attack, an attacker on the ground replays Sat B's watermark recorded three minutes earlier; the ID still decodes, but the one-time code has expired, so the observatory rejects it.
fig_caption: <strong>Who ruined the observation?</strong> A satellite's sidelobe drowns the telescope's faint source, and the observatory names the culprit from transmission timestamps alone, without demodulating anything. Each watermark carries a 16-bit one-time code from a seed the satellite and observatory share, valid for one minute. Press <em>Show a replay attack</em> and Eve records Sat B's watermark, then replays it three minutes later to frame Sat B; the code has expired, so the observatory rejects it. The code length, one-minute slice and timing-only decode are from the paper; satellite paths, burst timing and code values are made up.
fig_illustrative: true
abstract: Radio astronomy observatories examine the universe by capturing faint RF signals from space. The equipment to capture these signals is extremely sensitive, and nearby transmitters, such as LEO satellites, cause destructive interference. We propose the Spectra watermarking protocol to add an identifying fingerprint to these interfering transmitters. Spectra changes the timing of key transmissions to encode identifying information that can be decoded by examining transmission timestamps and without having to demodulate the actual transmission. We implement multiple forward error correction codes for Spectra to account for dynamic LEO satellite channels. We evaluate Spectra and show that it can operate over highly variable channels with low BER while preserving the network performance of the interfering device.
---
