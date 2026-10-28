---
title:  "A Replication Study of DSAV Measurement"
short_title: "DSAV replication"
summary: "Many networks still accept packets from outside that claim to come from inside. We repeated a 2020 measurement of this weakness across 444,781 DNS resolvers to see what had changed four years later."
authors: <b>Christopher Kitras</b>, Bryson Schiel
venue: "CS 660: Advanced Computer Networks, Brigham Young University"
venue_short: "CS 660, BYU"
year: 2024
figure: assets/Full_dsav.svg
link: assets/dsav.pdf
link_label: "Read the report"
links:
  - text: "Presentation"
    url: assets/dsav_pres.pdf
    note: "Class presentation slides"
fig_scripts: [dsav-spoof]
short:
  - label: "The goal"
    text: "A network should refuse packets from the outside that pretend to come from inside it, a check called DSAV. A 2020 study found many networks skip it, and we wanted to know whether that had improved."
  - label: "What we built"
    text: "A measurement that sends DNS lookups with forged inside addresses to hundreds of thousands of DNS servers and watches whether any of them follow through, repeating the original study's method."
  - label: "How it went"
    text: "Overall, little changed: about half the networks we tested still let a forged packet in. The tricks that worked shifted, though, and Russia stood out with a sharp improvement while most large countries got slightly worse."
---

## A packet that lies about where it came from

Every IP packet carries a source address, and nothing stops a sender from writing in someone else's. One useful lie is to claim an address from *inside* the network you are sending to. Devices inside a network often extend trust to their neighbors, so a packet that appears local can reach services that would refuse an outsider, and it can be the starting point for denial-of-service and other attacks.

The defense sits at the network's edge. **Destination-side source address validation (DSAV)** means the gateway checks packets arriving from outside and drops any whose source address belongs to the inside. If it is missing, the forged packet is delivered to its target as though it came from next door.

In 2020, Deccio et al. measured how widely DSAV is deployed, in a paper titled *Behind Closed Doors* at the ACM Internet Measurement Conference. They found it disabled in many autonomous systems (ASes, the independently run networks that make up the Internet). Our project for CS 660 repeated that measurement four years later to see whether anything had changed.

## Catching a missing check from outside

You can't see inside someone else's network, so the method borrows a service that will talk back: recursive DNS resolvers. A resolver takes a name lookup from a client and, if it doesn't know the answer, asks the authoritative server for that name.

We send a resolver a DNS query with a forged source address from its own network. The name in the query belongs to a domain whose authoritative server we control. If the gateway enforces DSAV, the query is dropped and nothing happens. If it doesn't, the resolver accepts the query as local, goes to look up the name, and that lookup arrives at our server, where we log it. A logged lookup that matches a query we sent is proof that the forged packet got in.

{% include fig.html id="dsav-spoof" aspect="16/9" illustrative=true label="A prober sends spoofed DNS queries to a recursive resolver behind a gateway. With DSAV off, queries with believable inside addresses reach the resolver, which looks the name up at our server, and the lookup is logged. With DSAV on, the gateway drops every one." caption="<strong>The measurement.</strong> The prober sends one query from each of the five kinds of forged source. With DSAV off, the believable ones reach the resolver, which then looks the name up at our server, and we log the failure. Turn DSAV on and the gateway drops them all. The 2020 and 2024 columns are measured: among targets that leaked at all, the share reached by at least one query of that kind. The addresses and the animation are examples; in the real data private, destination-as-source, and loopback queries almost never produced a lookup in 2024." %}

The converse doesn't hold. A resolver may ignore a query for many reasons besides DSAV, so silence is not proof that a network is protected. The analysis therefore focuses on failures, which are unambiguous.

## What we changed from the original

We followed the original method closely, with a few changes to fit a course project.

- **Where the targets came from.** Deccio et al. drew resolvers from a Day in the Life of the Internet (DITL) collection at the DNS root servers, about 11.2 million addresses over IPv4 and IPv6. We used the query logs of BYU's authoritative DNS servers from August 26 to September 15, 2024, and kept resolvers with IPv4 addresses asking for IPv4 records: 444,781 addresses.
- **IPv4 only**, because of network administration limits when we ran the measurement.
- **Fewer queries.** About 100 forged queries per resolver became up to 25, which still characterizes a network without spending as many resources.
- **Tooling.** We crafted and sent the forged packets with the Python library Scapy, captured traffic with tcpdump, looked up each AS's address ranges in RIPE data, and mapped ASes to countries with MaxMind GeoLite.

Each resolver received the same five kinds of forged source as in the original study: 21 addresses from other prefixes the AS announces, one from the resolver's own /24, the private address 192.168.0.10, the resolver's own address, and the loopback address 127.0.0.1. We capped the sending rate at 700 packets per second. Anyone who visited the domain named in our queries found a web page explaining the measurement, with contact information for administrators who wanted their server excluded.

## What changed in four years

Across all targets, the picture barely moved. 6.5% of resolver addresses and 51.5% of ASes let at least one forged query through, against 4.6% and 49% in 2020.

<dl class="results">
  <div><dt>resolver addresses queried</dt><dd>444,781</dd></div>
  <div><dt>ASes with at least one leak (49% in 2020)</dt><dd>51.5%</dd></div>
  <div><dt>Russian ASes reachable (59% in 2020)</dt><dd>6.89%</dd></div>
</dl>

What did change is *which* lies work. Forged addresses from the network's own prefixes remained the most effective, and at the address level became more so, while the cruder tricks died out. Using the target's own address as the source once reached 17% of leaking addresses and nearly half of leaking ASes; in 2024 it reached none. The private address nearly vanished, and loopback never worked in either study. The table gives, among leaking targets, the share reached by at least one query of each kind (the report's Table 3).

<table>
  <thead><tr><th>Forged source</th><th class="n">Addresses, 2024</th><th class="n">2020</th><th class="n">ASes, 2024</th><th class="n">2020</th></tr></thead>
  <tbody>
    <tr><th>Other prefix</th><td class="n">90.9%</td><td class="n">78%</td><td class="n">91.5%</td><td class="n">97%</td></tr>
    <tr><th>Same prefix</th><td class="n">74.1%</td><td class="n">63%</td><td class="n">92.0%</td><td class="n">91%</td></tr>
    <tr><th>Private</th><td class="n">0.74%</td><td class="n">3.4%</td><td class="n">0.9%</td><td class="n">12%</td></tr>
    <tr><th>Destination as source</th><td class="n">0%</td><td class="n">17%</td><td class="n">0%</td><td class="n">47%</td></tr>
    <tr><th>Loopback</th><td class="n">0%</td><td class="n">0%</td><td class="n">0%</td><td class="n">0%</td></tr>
  </tbody>
</table>

### Country by country

Nine of the ten countries with the most ASes in our data matched the original study's top ten; Indonesia replaced Australia. Our sample came from a US university's DNS logs, and the United States accounted for by far the most ASes. Most of the top ten fell between 30% and 70% of ASes reachable, and every one with a 2020 figure except Russia was more exposed than before.

<table>
  <thead><tr><th>Country</th><th class="n">ASes tested</th><th class="n">Reachable, 2024</th><th class="n">2020</th></tr></thead>
  <tbody>
    <tr><th>United States</th><td class="n">4,340</td><td class="n">40.23%</td><td class="n">28%</td></tr>
    <tr><th>Brazil</th><td class="n">2,613</td><td class="n">66.62%</td><td class="n">59%</td></tr>
    <tr><th>Russia</th><td class="n">1,161</td><td class="n"><b>6.89%</b></td><td class="n">59%</td></tr>
    <tr><th>Germany</th><td class="n">606</td><td class="n">38.94%</td><td class="n">36%</td></tr>
    <tr><th>India</th><td class="n">584</td><td class="n">69.00%</td><td class="n">41%</td></tr>
    <tr><th>Indonesia</th><td class="n">507</td><td class="n">75.34%</td><td class="n">–</td></tr>
    <tr><th>Great Britain</th><td class="n">489</td><td class="n">44.58%</td><td class="n">33%</td></tr>
    <tr><th>Poland</th><td class="n">472</td><td class="n">66.10%</td><td class="n">52%</td></tr>
    <tr><th>Canada</th><td class="n">445</td><td class="n">46.06%</td><td class="n">36%</td></tr>
    <tr><th>Ukraine</th><td class="n">386</td><td class="n">66.32%</td><td class="n">63%</td></tr>
  </tbody>
</table>

Two countries stand out. **Russia** had the third-most ASes in our data and the lowest exposure in the top ten: 6.89% of ASes, down from 59%, with exposed addresses down from 11.6% to 2.52%. **Brazil** went the other way: over half as many ASes as the United States, two-thirds of them reachable, a large attack surface in a single country.

At the extremes, countries with 0% or 100% exposure usually had only one to four ASes in our data, too few to say much. Among countries with large shares of exposed addresses, most were island nations or in Africa, and only Eswatini carried over from the original study's list.

## What we'd take from it

DSAV adoption has not improved much since 2020, even with a published catalog of the spoofing techniques that work. What has shifted is the kind of leak: the ones that remain depend on believable addresses from the network's own prefixes rather than on misconfigured operating systems accepting a loopback or self-addressed packet. That suggests where defenses should go next: simple ways for a network to notice traffic arriving from outside with addresses that belong inside it.

The study has clear limits. Our targets came from one university's DNS logs rather than the root-server DITL data, it covered IPv4 only, and each resolver got a quarter as many probes. The close match between our top ten countries and the original's suggests the sample is comparable, but the Russia and Brazil outliers could still partly reflect the dataset.
