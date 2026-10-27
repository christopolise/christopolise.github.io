---
title: "Location Verification of Crowd-Sourced Sensors"
short_title: "LaMDA: location verification"
summary: "Cheap community air-quality sensors have no GPS, so their location is whatever the owner types in. LaMDA verifies where a sensor is, and notices when it moves, using only the network it already talks over."
authors: <b>Christopher Kitras</b>, Carter Pollan, Kyle Myers, Camille Wirthlin Tischner, Philip Lundrigan
venue: "IEEE International Conference on Computer Communications and Networks (ICCCN), Honolulu, 2023"
venue_short: "ICCCN 2023"
bib_venue: "Proc. IEEE International Conference on Computer Communications and Networks (ICCCN)"
year: 2023
doi: "10.1109/ICCCN58024.2023.10230111"
area: sensing
first_author: true
featured: true
featured_order: 1
figure: assets/lamda.svg
link: assets/lambda.pdf
also_presented:
  - title: "Location Monitoring Framework for Citizen Science Sensors (poster)"
    venue: "Air Quality: Science for Solutions 2023"
    award: "Best Poster Award"
    url: assets/S4S-2023.pdf
links:
  - text: "IEEE Xplore"
    url: https://ieeexplore.ieee.org/document/10230111
    note: "Published version"
  - text: "Presentation"
    url: assets/Location_Verification_of_Citizen_Science_Sensors.pdf
    note: "ICCCN 2023 talk slides"
  - text: "Code"
    url: https://github.com/NET-BYU/LaMDA/tree/main
    note: "Open source on GitHub"
fig_scripts: [lamda-latency, lamda-cold]
short:
  - label: "The problem"
    text: "Community air-quality sensors now appear on Google and government maps, but they have no GPS. Their location is whatever the owner typed in, by mistake or on purpose."
  - label: "The idea"
    text: "During setup, borrow the owner's phone as a stand-in GPS and prove the phone and sensor share a network by timing both to a server. Afterward, watch the sensor's network path for signs it moved."
  - label: "The result"
    text: "Registration succeeded in 4,235 of 4,238 trials, a relayed sensor showed about 110 ms of extra delay against a 15 ms tolerance, and moves between cities were caught with no new hardware."
---

## Why location matters

Networks of low-cost sensors, PurpleAir being the best known, put tens of thousands of air-quality monitors in backyards and on balconies. Their readings now sit beside government stations on official air-quality maps and in Google search results. People with asthma or smoke sensitivity decide whether to go outside based on them.

None of these sensors has a GPS receiver. The owner types in the location during setup, and nothing checks it. An honest owner can misplace a pin or move the sensor and forget to update it. A motivated one can keep a sensor in clean air and register it in a polluted neighborhood, making that neighborhood look healthier on the map.

<aside>GPS would solve this, but it adds cost, does not work well indoors, and cannot be retrofitted to devices already deployed.</aside>

The question this paper asks: **can we prove a sensor is where its owner says it is, and notice if it moves, without adding any hardware?** We set three design goals. The solution must work without extra hardware, detect later moves, and run in an ordinary web browser so it doesn't depend on a particular phone app.

## Borrowing the phone's location

Almost every owner sets up their sensor with a smartphone in hand, and that phone knows where it is. LaMDA (Location and Movement Detection on the Application layer) uses the phone, the *registering device*, as a proxy for the sensor's location. The hard part is proving that the phone and the sensor are actually in the same place.

The proof rests on two network facts. First, devices behind the same home router share one public IP address. Second, two devices on the same home network see almost the same round-trip time to a distant server, and a device whose traffic is relayed through somewhere else does not. The server measures both.

{% include fig.html id="lamda-latency" aspect="16/9" illustrative=true label="A server exchanges ping messages with a phone and a sensor. When the sensor's traffic is relayed through a bridge, its latency rises far above the phone's and registration is rejected." caption="<strong>The latency check.</strong> The server pings the phone and the sensor ten times each and keeps the minimum round-trip time. On one network the two minimums agree to within the 15 ms tolerance. Turn on the bridge to relay the sensor through a cloud proxy, the attack we tested, and its latency jumps past the threshold. Packet timing is exaggerated so you can see it." %}

Registration works like this:

1. The phone opens the registration page, shares its location, and the server opens a secure WebSocket. The server sends a series of pings, each carrying a random number *R*; the phone answers with *R*&nbsp;+&nbsp;1. The minimum round-trip time becomes *L*<sub>RD</sub>.
2. The server issues a one-time session token. The phone joins the sensor's own setup Wi-Fi network and hands the token over as it submits the home Wi-Fi password.
3. The sensor joins the home network and sends the token back to the server, encrypted with a key burned into it at manufacture. Only a genuine sensor can produce it.
4. The server checks that the phone and sensor share a public IP address, then pings the sensor the same way to get *L*<sub>DEV</sub>.
5. If the gap &#124;*L*<sub>RD</sub>&nbsp;−&nbsp;*L*<sub>DEV</sub>&#124; is within the tolerance *L*<sub>TOL</sub>, the phone's location is accepted as the sensor's.

The incrementing nonce matters. The sensor's ping replies are encrypted, so an attacker on another network can't answer pings on its behalf by spoofing the home IP address. The whole flow also runs in a standard browser, which meant designing around browser rules (RFC&nbsp;1918) that block public web pages from talking to private network addresses.

### Choosing the tolerance

To set *L*<sub>TOL</sub>, we timed a Google Pixel 6a (the phone) and a Raspberry Pi 4B (the sensor) to the same server for ninety minutes, ten pings at a time. On the same network, their minimum latencies differed by about 15 ms. Relayed through ngrok, a common tunnelling proxy, the sensor's latency rose by roughly 110 ms. A 15 ms threshold sits between the two.

<dl class="results">
  <div><dt>registration success (4,235 of 4,238 attempts)</dt><dd>99.93%</dd></div>
  <div><dt>latency tolerance between phone and sensor</dt><dd>15 ms</dd></div>
  <div><dt>extra latency added by a proxy bridge</dt><dd>~110 ms</dd></div>
</dl>

The method has a stated limit: a bridge that terminates physically close to the home adds almost no propagation delay, so a nearby relay would pass. It catches relays from far away, which is the attack that matters for faking a location on a map.

## Noticing when a sensor moves

Registration proves where the sensor was. The second half of the system, Change of Location Detection (CoLD), checks that it stays there, and it does so entirely from the server, with no help from the sensor.

It combines two signals the server already has. **Gaps:** sensors upload on a fixed schedule, and moving one usually means unplugging it, which leaves a hole in its data. CoLD flags a gap when no reading arrives for three upload intervals. **Paths:** every ten minutes a logger runs `traceroute` from the server to the sensor's home router and stores the list of hops. The path through the Internet reflects the neighborhood and provider a device connects through.

{% include fig.html id="lamda-cold" aspect="16/9" illustrative=true label="A timeline of sensor uploads with a gap. Traceroute paths before and after the gap are compared; the similarity score stays above the 90 percent threshold unless the sensor moved." caption="<strong>Change of Location Detection.</strong> Uploads arrive every few minutes until the sensor goes quiet. After the gap, CoLD compares a week of trusted paths from before the gap with the new paths. Choose whether the sensor really moved and watch the score land above or below the 90% threshold." %}

Internet paths change on their own as routers rebalance traffic, so comparing one path before with one path after would raise false alarms. CoLD instead scores the paths seen after the gap against a full week of trusted paths from before it. If the score drops below 90%, the sensor's new data is quarantined and the owner is asked to register it again. The threshold deliberately leans toward false alarms: asking an owner to re-register costs far less than missing a moved sensor.

## How far does it see?

We logged traceroutes from one server to 15 locations every ten minutes for 20 weeks, in three groups: four rural sites about 64 km apart, five sites in neighboring cities about 13 km apart, and six sites a few blocks apart within one city. To test detection, we simulated a move by splicing the data from one location before a gap with the data from another after it.

The table shows the inter-city group. Each cell is the average similarity score when one site's history is compared with another site's new paths. The diagonal is a sensor that didn't move and should score high. Everything off the diagonal is a move and should score low.

<table>
  <thead><tr><th>trusted ↓ / new →</th><th class="n">A</th><th class="n">B</th><th class="n">C</th><th class="n">D</th><th class="n">E</th></tr></thead>
  <tbody>
    <tr><th>A</th><td class="n"><b>99.9</b></td><td class="n">0</td><td class="n">0</td><td class="n">0</td><td class="n">14.6</td></tr>
    <tr><th>B</th><td class="n">0</td><td class="n"><b>96.4</b></td><td class="n">0</td><td class="n">0</td><td class="n">0</td></tr>
    <tr><th>C</th><td class="n">0</td><td class="n">0</td><td class="n"><b>99.7</b></td><td class="n">0</td><td class="n">0</td></tr>
    <tr><th>D</th><td class="n">0</td><td class="n">0</td><td class="n">0</td><td class="n"><b>98.0</b></td><td class="n">0</td></tr>
    <tr><th>E</th><td class="n">11.3</td><td class="n">0</td><td class="n">0</td><td class="n">0</td><td class="n"><b>99.8</b></td></tr>
  </tbody>
</table>

Moves between rural sites and between cities scored far below the 90% threshold; the few non-zero cells came from sites on the same Internet provider. Within a single city the picture changes: some sites a few blocks apart share paths and scored 66.6%. That's still below the threshold, but too close to rely on. Traceroute can't resolve movement that small, so the honest claim is that location is verified to about the size of a city. For a public air-quality map, that is the scale that matters.

## What I'd take from it

The system adds a capability, verified location, to devices that were never designed for it, using only things already in the loop: the owner's phone, the device's own network path, and a server. The firmware change is small enough to ship as an update to sensors already in the field, with no recall. The code is open source so that the people running these sensor networks can adopt it.
