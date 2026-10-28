---
title: If You Build It, Will They Connect? 6 GHz WiFi in a Stadium
authors: Ethan Sorensen, Doug Hales, <b>Christopher Kitras</b>, Jamison Lofthouse, Joshua Montierth, Philip Lundrigan
venue: IEEE International Conference on Computer Communications and Networks (ICCCN), 2026
year: 2026
figure: assets/stadium.png
link: assets/Stadium_Study.pdf
links:
- text: IEEE Xplore
  url: https://ieeexplore.ieee.org/document/11662642
  note: Published version
- text: Dataset
  url: https://github.com/NET-BYU/LavellEdwards-6GHz
  note: Stadium measurements on GitHub
link_label: Paper
fig: stadium-6ghz-steering
fig_aspect: 16/9
fig_label: Phones flow into the stadium. About half are routed by Passpoint to the Verizon 5 GHz network, including some phones that could use 6 GHz. The rest join Cougars WiFi, and in 2025 about a fifth of them move to 6 GHz; in 2024 almost none do.
fig_caption: <strong>Where phones end up.</strong> About half the crowd is signed in to Verizon's 5 GHz network by Passpoint before any band choice happens, including phones that could use 6 GHz (rings). Of the rest, 21% reached 6 GHz once OWE transition mode let them move automatically in 2025. Switch to 2024, when fans had to choose the 6 GHz network by hand, and almost nobody did. The bar shares follow the paper's estimates; the 2024 value and the motion are illustrative.
fig_illustrative: true
abstract: 'The opening of the 6 GHz spectrum promises substantial capacity gains for dense WiFi deployments, yet real-world performance depends critically on configuration choices rather than spectrum availability alone. This paper presents a measurement study of a large-scale outdoor WiFi 6E deployment at Brigham Young University’s LaVell Edwards Stadium, combining two years of operational data with targeted measurements during football games. Despite the RF advantages of 6 GHz, capacity-based configuration preferences result in only modest performance improvements compared to 5 GHz. While 6 GHz achieves 3.4× higher median throughput (28 Mbps vs 8 Mbps) and 90% lower channel utilization (3.1% vs 31.4%), both bands fall well below expected performance levels. More critically, client adoption remains the dominant limiting factor: automated Passpoint steering redirects ∼50% of stadium clients, an estimated 20% of whom are 6 GHz-capable, exclusively to 5 GHz, while WiFi chipset-level association
  decisions prevent manual band selection. Historical data reveals that migration to OWE transition mode increased 6 GHz adoption from near-zero to 21% of non-steered clients.'
---
