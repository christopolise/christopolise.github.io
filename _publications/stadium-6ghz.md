---
title: "If You Build It, Will They Connect? 6 GHz WiFi in a Stadium"
short_title: "6 GHz stadium WiFi"
summary: "BYU's football stadium installed WiFi 6E, opening the uncrowded 6 GHz band to fans. We measured two years of it and found the new band works well, but most phones never reach it because of how the network decides who goes where."
authors: Ethan Sorensen, Doug Hales, <b>Christopher Kitras</b>, Jamison Lofthouse, Joshua Montierth, Philip Lundrigan
venue: "IEEE International Conference on Computer Communications and Networks (ICCCN), 2026"
venue_short: "ICCCN 2026"
bib_venue: "Proc. IEEE International Conference on Computer Communications and Networks (ICCCN)"
year: 2026
area: wireless
figure: assets/stadium.png
link: assets/Stadium_Study.pdf
links:
  - text: "IEEE Xplore"
    url: https://ieeexplore.ieee.org/document/11662642
    note: "Published version"
  - text: "Dataset"
    url: https://github.com/NET-BYU/LavellEdwards-6GHz
    note: "Stadium measurements on GitHub"
fig_scripts: [stadium-6ghz-steering]
short:
  - label: "The problem"
    text: "A new WiFi band at 6 GHz promises far more room for crowded places like stadiums. Nobody had checked whether fans at a real stadium actually end up using it."
  - label: "The idea"
    text: "Measure LaVell Edwards Stadium on game days with phones running a WiFi logging app, and combine that with two years of the stadium's own network records to see where phones connect and why."
  - label: "The result"
    text: "Phones on 6 GHz got about 3.4 times the speed of those on 5 GHz, but only about one in ten phones got there. Automatic carrier sign-in sends half the crowd straight to 5 GHz."
---

## More spectrum, same crowd

In a full stadium, the radio spectrum, not the Internet connection, is usually what limits WiFi. In 2020 the FCC opened the 6 GHz band to unlicensed WiFi, and in 2024 it finalized the rules for outdoor standard-power access points. About 1.2 GHz of new spectrum became available, 850 MHz of it usable outdoors. Large venues are adopting it to relieve congested 5 GHz networks.

BYU's LaVell Edwards Stadium was retrofitted with WiFi 6E in 2023: 1,010 Extreme Networks AP5050 access points throughout the bowl. Outdoor 6 GHz radios must ask an Automated Frequency Coordination (AFC) service how loud they may be, to protect existing licensed links. Provo has no significant incumbents nearby, so the stadium's radios run without AFC restrictions. That makes it a clean test: if 6 GHz underperforms here, the cause is configuration, not regulation.

The question this paper asks: **when a stadium adds 6 GHz, does the extra spectrum turn into a better experience for the people in the seats?**

## How we measured

We measured the stadium on two game days and while it was empty, using six Android phones running SigCap. SigCap scans every WiFi channel and logs each access point it hears (signal strength, channel utilization, transmit power, advertised link speed, station count) every five seconds with a GPS fix. We ran iperf3 throughput tests from fixed seats and while walking the bowl, always on the same phone, a Galaxy S24 FE, because link speeds varied by up to 33% between phone models. BYU's Office of Information Technology supplied two years of the access points' own reports: client counts, traffic, and which network each client joined.

Coverage turned out not to be the issue. The median signal strength was −78 dBm on 5 GHz and −79 dBm on 6 GHz, about the same whether the stadium was empty or full. A full crowd cut the number of access points each phone could hear from about 270 to 52, which focused each phone on nearby, strong ones.

## Which network decides the band

The stadium broadcasts several networks, and the way they fit together decides which band a phone lands on.

- **BYU Cougars WiFi** (5 GHz, open) is the only network a fan sees.
- 6 GHz requires Opportunistic Wireless Encryption (OWE), which older phones lack. So in 2025 the open network also advertises a hidden 5 GHz OWE network, and the 6 GHz OWE network broadcasts under the same name. Phones that support OWE switch over automatically. In 2024, 6 GHz was a separate network that fans had to find and pick themselves.
- **VerizonWiFiAccess** (5 GHz) uses Passpoint (Hotspot 2.0), which signs Verizon customers in automatically, with no prompt and no choice of band.

{% include fig.html id="stadium-6ghz-steering" aspect="16/9" illustrative=true label="Phones flow into the stadium. About half are routed by Passpoint to the Verizon 5 GHz network, including some phones that could use 6 GHz. The rest join Cougars WiFi, and in 2025 about a fifth of them move to 6 GHz; in 2024 almost none do." caption="<strong>Where phones end up.</strong> About half the crowd is signed in to Verizon's 5 GHz network by Passpoint before any band choice happens, including phones that could use 6 GHz (rings). Of the rest, 21% reached 6 GHz once OWE transition mode let them move automatically in 2025. Switch to 2024, when fans had to choose the 6 GHz network by hand, and almost nobody did. The bar shares follow the paper's estimates; the 2024 value and the motion are illustrative." %}

The historical data shows the effect of that change. Before the 2025 season, the 6 GHz network was almost entirely unused: most phones had joined the stadium WiFi before 6 GHz existed and had no reason to look for a new network. Once OWE transition mode let capable phones move on their own, 6 GHz association jumped to about 21% of Cougars WiFi clients. Even then, the phone decides: its WiFi chipset picks between the hidden 5 GHz OWE network and the 6 GHz one, regardless of which would be faster or which the access point prefers.

Passpoint is the larger obstacle. Across two years of events, Verizon's network carried over half the stadium's devices at nearly every event, and all of them were on 5 GHz. If Verizon customers' phones are 6 GHz-capable at the same rate as everyone else's, about 10.5% of the whole crowd, half of all capable phones, is steered away from 6 GHz before it has a chance to use it.

## What the new band delivers

The phones that reached 6 GHz did much better. Each access point carries about eight times as many clients on 5 GHz as on 6 GHz, counting both 5 GHz networks, and the 5 GHz channels were busy about ten times as often.

<dl class="results">
  <div><dt>median measured throughput, 6 GHz vs 5 GHz</dt><dd>28 vs 8 Mbps</dd></div>
  <div><dt>median channel utilization, 6 GHz vs 5 GHz</dt><dd>3.1% vs 31.4%</dd></div>
  <div><dt>share of non-Passpoint clients on 6 GHz after OWE transition mode</dt><dd>21%</dd></div>
  <div><dt>share of all clients steered to 5 GHz by Passpoint</dt><dd>~50%</dd></div>
</dl>

Both bands still fell short of what the access points advertised. In dense WiFi networks, TCP goodput can fall to 20 to 30% of the advertised link rate. 6 GHz managed 20.5%; 5 GHz managed 3.8%.

The access points' configuration explains part of the gap. The stadium uses narrow 20 MHz channels, all 25 available on 5 GHz and the 42 that 6 GHz allows outdoors, and turns power down well below the roughly 30 dBm that standard-power access points may use. Smaller, quieter cells let the same channel be reused more often, which favors capacity over peak speed. We compared this with a published study of Notre Dame Stadium, which made the opposite choices.

<table>
  <thead><tr><th></th><th>LaVell Edwards (BYU)</th><th>Notre Dame</th></tr></thead>
  <tbody>
    <tr><th>6 GHz channel width</th><td>20 MHz, 42 outdoor channels</td><td>80 MHz, 9 outdoor channels</td></tr>
    <tr><th>Mean 6 GHz transmit power</th><td class="n">13.4 dBm</td><td class="n">27 dBm</td></tr>
    <tr><th>Top advertised link speed</th><td class="n">286 Mbps</td><td class="n">&gt;1 Gbps</td></tr>
    <tr><th>Automatic steering</th><td>Passpoint (Verizon)</td><td>none on game days</td></tr>
    <tr><th>6 GHz adoption</th><td>21% of non-Passpoint clients (~10.5% of all)</td><td>14%</td></tr>
  </tbody>
</table>

Notre Dame's wider, louder channels offer much higher top speeds, but at the cost of capacity and a higher risk of interfering with licensed users in aggregate. Neither design gets most phones onto 6 GHz.

## What I'd take from it

New spectrum doesn't help by existing. At LaVell Edwards the 6 GHz band was less crowded, faster, and had good coverage, yet most of the crowd never used it, because of decisions made before any phone compared the two bands: which networks auto-join, how 6 GHz is advertised, and what the phone's chipset prefers. A 6 GHz deployment has to plan how clients get onto the band, not only the RF design. The stadium measurements are published as an open dataset so other deployments can compare.
