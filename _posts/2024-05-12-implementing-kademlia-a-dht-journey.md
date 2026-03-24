---
layout: post
title: Implementing Kademlia - A DHT journey
date: 2024-05-12
---

Kademlia is a resilient and tolerant distributed hash table and network implementation. A lot of the tolerance and resilience depend on…

------------------------------------------------------------------------

### Implementing Kademlia: A DHT journey

***kademlia*** is a resilient and tolerant distributed hash table and network implementation. A lot of the tolerance and resilience depend on implementation choices.

------------------------------------------------------------------------

#### Implementation

I’ve developed a basic Proof of Concept (POC) in Python, primarily to understand the paper and to gain a deeper understanding of the protocol. I learned and relearned a few things while implementing the network connectivity.

Code: <a href="https://github.com/vmandke/kademlia" class="markup--anchor markup--p-anchor" data-href="https://github.com/vmandke/kademlia" rel="nofollow noopener noopener noopener noopener" target="_blank">https://github.com/vmandke/kademlia</a>

*Note: the code does have a few edge cases which are not handled, PRs are welcome! And the code is in no way meant to be production grade :D*

------------------------------------------------------------------------

#### What is kademlia and how it works?

Kademlia represents a distributed table, meaning that the keys and values within it are dispersed across the nodes of the network. One remarkable facet of Kademlia is its ability to manage vast networks while requiring each participating node to only keep track of a handful of other nodes. However, crucial to Kademlia’s functionality is the necessity for each peer, or node, to maintain connections with specific nodes. This ensures that any node within the network remains reachable from any starting point — a pivotal aspect that underpins Kademlia’s effectiveness, as we’ll explore in greater detail.

Nodes in `kademlia` form leaves in a binary subtree. Every node assigns itself a random id, this `id` is then converted into a 160 bit binary format representation. Kademlia protocol ensures that every nodes knows of at least one node in each of its subtree.

<figure id="f2ae" class="graf graf--figure graf-after--p">
<img src="/assets/posts/46acbb5f24189d86f1c99a0e0b2fdb9745a2427d.png" class="graf-image" data-image-id="1*qzByDvohsbYHIECxYvCP7A.png" data-width="1025" data-height="293" />
</figure>

#### Why does a peer need at least one access point in each subtree?

In an ideal situation (assuming there aren’t any intermittent failures) kademlia guarantees that a node can reach any other node in the network while maintaining information of only a handful of other peers. A node tries to reach out to ***destination*** by exploring the network of its tracked peers. To ensure that any node in the network is reachable, kademila enforces a `strict` rule as to which nodes can constitute a peer.

eg: Let’s consider this node `0011` in a complete network of 16 nodes. (The addition of another node causes an increase in depth). Following are the subtrees it needs to keep access to.

1.  <span id="4724">`1xxx`</span>
2.  <span id="9447">`01xx`</span>
3.  <span id="bd62">`000x`</span>
4.  <span id="0926">`0010`</span>

Zoom in on `00` for a bit

<figure id="72de" class="graf graf--figure graf-after--p">
<img src="/assets/posts/b7e96bd76a8d90ec4fe518ea690905f7a54db1c8.png" class="graf-image" data-image-id="1*Iib14-xE6-B8yDfhr4NCzA.png" data-width="243" data-height="195" />
</figure>

`0011` has access to `0010` and either of `0001` or `0000` . Let's say `0011` knows `0001` . By protocol `0001` should know its direct sibling `0000` So `0001` can reach `0000` by a hop to `0001` . Extrapolating this to the wider network, and given all nodes are up and running without delays — we can say a node can reach any other node in the network if it has at least one point of contact in all other subtrees.

#### Starting a new network

When a peer initiates without any preconfigured settings, it essentially launches its own isolated network. Until another node joins as its peer, this solitary node remains undiscoverable to others. Once a peer connection is established, the network becomes active, enabling the flow of messages across the peer-to-peer (P2P) system, thereby bringing it fully online.

#### How to join a network

In a decentralized network, each peer must be aware of at least one other peer within the network it intends to join. Without a central authority, peers rely on sending discovery messages and recursively attempting to locate one another. Through this decentralized process, peers gradually discover and connect with others in the network, forming a distributed network topology.

#### starting…

``` graf
python3 server.py

....

INFO:routing:Routing Table :: {'bid': '0000', 'depth': 4, 'k': 1, 'routing_table': {'1': [], '01': [], '001': [], '0001': []}, 'owner_peer_config': '0000 0.0.0.0 4242'}
```

This starts a network. As there isn't another peer to connect with it.. It literally does noops over and over. Lets understand the log a bit more.

A ***kademila*** peer finds its way to any other node in the network by pinging and sending messages across the network. Every peer maintains a routing table. The log above says that peer `0000` has no known peers for prefixes `1` `01` `001` and its immediate sibling`0001` Let's understand why this peer is only interested in this set of prefixes.

Discovery in ***kademlia*** is analogous to a binary search in a sorted array. All nodes in the network are represented by leaf nodes over a binary tree such that the node’s binary representation forms the path on network tree. \
so our node `0000` places itself as follows

<figure id="c2b4" class="graf graf--figure graf-after--p">
<img src="/assets/posts/560ae1a73c716228864e39aeeed7f12698bca88b.png" class="graf-image" data-image-id="1*hb0esG5dLy_87BYZwgeeEQ.png" data-width="1308" data-height="538" />
<figcaption>the node 0000 as it sees itself in the network</figcaption>
</figure>

#### ***Let's add another node to the network***

``` graf
python3 server.py --bid "1111" --port 4244 --bootstrap-bid "0000" --bootstrap-ip "0.0.0.0" --bootstrap-port "4242"
```

Now there are 2 nodes in the system. As the new peer contacts the first one both peers know of each other. So from both nodes perspective there are 2 nodes. Lets and another peer.

``` graf
server.py --bid "1101" --port 4246 --bootstrap-bid "0000" --bootstrap-ip "0.0.0.0" --bootstrap-port "4242"
```

Now we have 3 peers in the network, however, all of them have a different view of their own `Universe` (or as I call the network from a peer’s POV in the code.

``` graf

INFO:routing:Routing Table :: {'bid': '0000', 'depth': 4, 'k': 1, 'routing_table': {'1': ['1111 0.0.0.0 4244'], '01': [], '001': [], '0001': []}, 'owner_peer_config': '0000 0.0.0.0 4242'}

INFO:routing:Routing Table :: {'bid': '1111', 'depth': 4, 'k': 1, 'routing_table': {'0': ['0000 0.0.0.0 4242'], '10': [], '110': ['1101 0.0.0.0 4246'], '1110': []}, 'owner_peer_config': '1111 0.0.0.0 4244'}

INFO:routing:Routing Table :: {'bid': '1101', 'depth': 4, 'k': 1, 'routing_table': {'0': ['0000 0.0.0.0 4242'], '10': [], '111': ['1111 0.0.0.0 4244'], '1100': []}, 'owner_peer_config': '1101 0.0.0.0 4246'}
```

<figure id="de08" class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--pre" style="width: 33.405%;">
<img src="/assets/posts/447c49d6c6d5c121aef8ffcbeaf35725c6438bb1.png" class="graf-image" data-image-id="1*w7cKdh7n8Mu8l-JdkI1gXA.png" data-width="1490" data-height="530" />
</figure>
Universe for 0000
<figure id="1d36" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 33.678%;">
<img src="/assets/posts/f899871eae258ca0b88b8544d91ec8dacd027225.png" class="graf-image" data-image-id="1*YOHIzxu0GwWrpInBJkMDNw.png" data-width="1774" data-height="626" />
</figure>
Universe for 1111
<figure id="93cf" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 32.917%;">
<img src="/assets/posts/67dc103c341be122707b3d9a5392276021817f51.png" class="graf-image" data-image-id="1*zbFjjzTAVbgNeR2SvraHVw.png" data-width="1734" data-height="626" />
<figcaption>Universe for 1101</figcaption>
</figure>

So what is happening here? `1101` joined the network with `0000` as a peer, so `0000` should have seen and expanded its `universe` right?\
Umm.. So kademlia-peer tries to maintain peers from its prefixes such that it can do a sort of binary search across the network. Consider the `universe` for `1101` above it needs peers from `0` `10` `111` and its direct neighbor `1100`

#### Let's kill 0000

Now each universe is as follows; `0000` is lost

<figure id="b16b" class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 45.803%;">
<img src="/assets/posts/7bf1baca8869626838467a80db13159e2465194f.png" class="graf-image" data-image-id="1*sd3XqFZHJqw7k4MxmoZsmQ.png" data-width="1380" data-height="602" />
</figure>

<figure id="7cbc" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 54.197%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/800/1*tgUg5S3uwSoRxK4lWAm4Rg.png" data-original-image-title="" data-image-id="1*tgUg5S3uwSoRxK4lWAm4Rg.png" data-width="1752" data-height="646"></span>
</figure>

#### Now let's add `1100` and `0010`

<figure id="251b" class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--h4" style="width: 50.087%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/600/1*ZMsvF5N0v6yLjok5tmv8VA.png" data-original-image-title="" data-image-id="1*ZMsvF5N0v6yLjok5tmv8VA.png" data-width="1732" data-height="748"></span>
</figure>

<figure id="61da" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 49.913%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/600/1*2wWX6kSWc7rbWlWCahokfQ.png" data-original-image-title="" data-image-id="1*2wWX6kSWc7rbWlWCahokfQ.png" data-width="1620" data-height="702" data-is-featured="true"></span>
<figcaption>Univereses for 1111 and 1101</figcaption>
</figure>

<figure id="513a" class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 47.091%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/600/1*8-E7WBTdfw7vKztM_kql6A.png" data-original-image-title="" data-image-id="1*8-E7WBTdfw7vKztM_kql6A.png" data-width="1598" data-height="840"></span>
</figure>

<figure id="f83a" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 52.909%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/800/1*kbb5HJGXLpbgbpgf1tmHYw.png" data-original-image-title="" data-image-id="1*kbb5HJGXLpbgbpgf1tmHYw.png" data-width="1402" data-height="656"></span>
<figcaption>Universes for 1100 and 0010</figcaption>
</figure>

#### What is happening here?

`1111` saw a new node `1100` however it already had registered `1101` so it choose to ignore it. When `1111` saw `0010` it added it as it didn't have another node from prefix `0`

When `1101` saw its neighbor it added it as it needs to have access to it

Similary, when `0010` saw there other 3 peers, it only needed to store one of them, and it chose to store `1101` as that was its joining peer

#### **Finding nearest peers**

Lets say there are following nodes in the network

<figure id="c558" class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--p" style="width: 32.873%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/400/1*rjSKOAatf4-ErWPv6gjnQw.png" data-original-image-title="" data-image-id="1*rjSKOAatf4-ErWPv6gjnQw.png" data-width="1510" data-height="628"></span>
</figure>

<figure id="79d6" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 67.127%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/1000/1*zMFdqK_6DfKkYvM6MrxYyg.png" data-original-image-title="" data-image-id="1*zMFdqK_6DfKkYvM6MrxYyg.png" data-width="3456" data-height="704"></span>
<figcaption>Universes for 0000 and 1111 respectively</figcaption>
</figure>

<figure id="a239" class="graf graf--figure graf--layoutOutsetRow is-partialWidth graf-after--figure" style="width: 49.157%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/600/1*5V7vc-3jQR2f2R2c3D34hQ.png" data-original-image-title="" data-image-id="1*5V7vc-3jQR2f2R2c3D34hQ.png" data-width="3456" data-height="770"></span>
</figure>

<figure id="ace4" class="graf graf--figure graf--layoutOutsetRowContinue is-partialWidth graf-after--figure" style="width: 50.843%;">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/800/1*f40S2BEUJ0CtWlYblSkNXg.png" data-original-image-title="" data-image-id="1*f40S2BEUJ0CtWlYblSkNXg.png" data-width="3444" data-height="742"></span>
<figcaption>Universe for 1011 and 1010 respectively</figcaption>
</figure>

How can `0000` find `1010` ?

See the following traversal

<figure id="cf5c" class="graf graf--figure graf--layoutOutsetCenter graf-after--p">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/1200/1*V02vl7dPbircjKiGtsRGqQ.png" data-original-image-title="" data-image-id="1*V02vl7dPbircjKiGtsRGqQ.png" data-width="2092" data-height="484"></span>
<figcaption>Traversing from 0000 -&gt; 1010</figcaption>
</figure>

#### How does this work ???

***kademlia*** works with an XOR metric to keep getting closer and closer to the required peer. Above `0000` only knew `1111` , `1111` knew `1011` and `1011` knew `1010` Here our search stops.

***kademlia*** peers always try and find the next best closest neighbour, ensuring the search is completed in almost `log(n)` steps for a network with `n` peers (this is similar to binary search)

#### Why does XOR work

<figure id="5959" class="graf graf--figure graf-after--h4">
<span class="image placeholder graf-image" data-original-image-src="https://cdn-images-1.medium.com/max/800/1*PorazQSBqsVtwwXVSgGcFQ.png" data-original-image-title="" data-image-id="1*PorazQSBqsVtwwXVSgGcFQ.png" data-width="1036" data-height="402"></span>
<figcaption>from Wikipedia: <a href="https://en.wikipedia.org/wiki/Exclusive_or" class="markup--anchor markup--figure-anchor" data-href="https://en.wikipedia.org/wiki/Exclusive_or" rel="nofollow noopener" target="_blank">https://en.wikipedia.org/wiki/Exclusive_or</a></figcaption>
</figure>

``` graf
def get_xor(bid1, bid2):
    return "{0:b}".format(int(bid1, 2) ^ int(bid2, 2)), int(bid1, 2) ^ int(bid2, 2)
```

For any distance metric to work it should have the following rules

1.  <span id="4c27">A⊕B = B⊕A</span>
2.  <span id="03aa">A⊕A = `0` *implies*, B⊕B = `0`</span>
3.  <span id="0e3e">A⊕B + B⊕C ≥ A⊕C *also called* <a href="https://en.wikipedia.org/wiki/Triangle_inequality" class="markup--anchor markup--li-anchor" data-href="https://en.wikipedia.org/wiki/Triangle_inequality" rel="noopener" target="_blank" title="Triangle inequality"><em>triangle inequality</em></a></span>

Rules `1`and `2`are quite straightforward.

``` graf
A = "0000"
B = "1000"
C = "1011"
get_xor(get_xor(A, B)[0], C)
('11', 3)
get_xor(A, get_xor(B, C)[0])
('11', 3)
```

#### Why is triangle inequality true for ⊕ ?

Rule `3` in simple terms means that given 3 coords A, B, C all connected, the shortest path to reach is `C` from `A` is `A-C` and not `A->B->C`

XOR is associative and communicative

Associative =\> A ⊕ (B ⊕ C ) = ( A ⊕ B ) ⊕ C = A ⊕ B ⊕ C

Identity =\> A ⊕ 0 = A

So now we can use this to derive the Rule `3`

1.  <span id="2c8c">(A⊕B) ⊕ (B⊕C)</span>
2.  <span id="3cdf">= A⊕B⊕B⊕C</span>
3.  <span id="7787">= A⊕ 0 ⊕ C</span>
4.  <span id="6b65">= A ⊕ C</span>

The above illustrates that (x ⊕ y) ⊕ ( y ⊕ z) is actually = x ⊕ z. This satisfies the triangle inequality.

#### Learnings

Implementing ***kademlia*** network was a fun weekend activity. Following were few of my learnings

1.  <span id="d3b7">***kademlia*** always ensures that the oldest peer it has seen and alive is retianed while new peers from same `prefix` are ignored. This has two fold advantage. First the old peer has more credibility for being in the network. And second, it reduces `routing_table` unnecessary updates, else the routing tables will get updated on every `refresh`</span>
2.  <span id="095d">Distributed networks run heavily on timeouts. Managing timeouts is critical and it determines whether the whole system `just`works or not</span>

------------------------------------------------------------------------

#### References

1.  <span id="6275"><a href="https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf" class="markup--anchor markup--li-anchor" data-href="https://pdos.csail.mit.edu/~petar/papers/maymounkov-kademlia-lncs.pdf" rel="noopener" target="_blank">Original Paper</a></span>
2.  <span id="79b4"><a href="https://www.youtube.com/@AsliEngineering" class="markup--anchor markup--li-anchor" data-href="https://www.youtube.com/@AsliEngineering" rel="noopener" target="_blank">Arpit Bhayani</a>’s video on <a href="https://youtu.be/_kCHOpINA5g?feature=shared" class="markup--anchor markup--li-anchor" data-href="https://youtu.be/_kCHOpINA5g?feature=shared" rel="noopener" target="_blank">kademlia</a></span>
3.  <span id="c6e7">Wikipedia: <a href="https://en.wikipedia.org/wiki/Kademlia#System_details" class="markup--anchor markup--li-anchor" data-href="https://en.wikipedia.org/wiki/Kademlia#System_details" rel="noopener" target="_blank">Kademlia</a></span>
4.  <span id="8daa">Wikipedia: <a href="https://en.wikipedia.org/wiki/Exclusive_or" class="markup--anchor markup--li-anchor" data-href="https://en.wikipedia.org/wiki/Exclusive_or" rel="noopener" target="_blank">XOR</a></span>

---
Originally Published on [Medium](https://medium.com/@vmandke) on May 12, 2024.
