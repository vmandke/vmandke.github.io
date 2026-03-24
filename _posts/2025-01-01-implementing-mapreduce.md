---
layout: post
title: Implementing MapReduce
date: 2025-01-01
---

Below is the process I followed to create a simple, working Proof of Concept (POC) for MapReduce, inspired by the blueprint outlined in the…

------------------------------------------------------------------------

### Implementing Map Reduce

Below is the process I followed to create a simple, working Proof of Concept (POC) for MapReduce, inspired by the blueprint outlined in the seminal paper.

Let’s start with one of the simplest problems: counting the number of records in a file. You might ask, “Why even bother with this? Won’t `wc` do the job?" However, bear with me. Counting lines is simple enough and easily testable. If you find the system outputting 20 when there should have been 100, that's a bug — and we can fix it! :)

Begin with cloning the repository

Repo: <a href="https://github.com/vmandke/mapred/tree/main" class="markup--anchor markup--p-anchor" data-href="https://github.com/vmandke/mapred/tree/main" rel="nofollow noopener" target="_blank">https://github.com/vmandke/mapred</a>

``` graf
git clone git@github.com:vmandke/mapred.git
export MAPRED_ROOT=/Users/vmandke/Projects/mapred
```

We start with a sufficiently large data file. For this purpose, I got the file from...

``` graf
wget -P $MAPRED_ROOT/data/ https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023/resolve/main/raw/review_categories/Books.jsonl
```

First, let’s boot up the driver and a few workers. Run the following in a different tab.\
**Note**: Ensure the driver starts on port 5001.

``` graf
PYTHONPATH=$MAPRED_ROOT python $MAPRED_ROOT/mapred/runner.py driver --port 5001
PYTHONPATH=$MAPRED_ROOT python $MAPRED_ROOT/mapred/runner.py worker --driver-uri http://127.0.0.1:5001 --port 5005
PYTHONPATH=$MAPRED_ROOT python $MAPRED_ROOT/mapred/runner.py worker --driver-uri http://127.0.0.1:5001 --port 5006
PYTHONPATH=$MAPRED_ROOT python $MAPRED_ROOT/mapred/runner.py worker --driver-uri http://127.0.0.1:5001 --port 5007
```

Navigate to <a href="http://127.0.0.1:5001/get_work_status" class="markup--anchor markup--p-anchor" data-href="http://127.0.0.1:5001/get_work_status" rel="nofollow noopener noopener" target="_blank">http://127.0.0.1:5001/get_work_status</a>\
This will auto-reload as the job progresses.

<figure id="36b1" class="graf graf--figure graf--layoutOutsetCenter graf-after--p">
<img src="/assets/posts/3d000b9a378746f0932646668aed87f1e4680a98.png" class="graf-image" data-image-id="1*f_e3LKT0pWEGtOVqTB7-RA.png" data-width="2724" data-height="1162" data-is-featured="true" />
</figure>

So, we have 3 workers running, waiting for tasks, and a Driver. Please note that I am using “Driver” as opposed to the “Master” convention followed in the 2004 paper. How the world changes! :)

------------------------------------------------------------------------

We are in the Python world, so under `lib` is where we would interact with the system. Assume we have a huge 20GB file in the `/data` folder. For simplicity, we want to calculate the number of lines in the entire file. All you need to do is use `client.py`.

``` graf
import json
import os

from lib import submit_mapred_job_and_wait
from mapred.store.parser import JSONRecordParser
from mapred.store.file_fetcher import FileFetcher


def count_records():
    driver_uri = "http://127.0.0.1:5001"

    data_path = os.path.join(os.path.dirname(__file__), "data", "Books.jsonl")
    parser = JSONRecordParser(record_delimiter="\n", data_parser=json.loads)
    fetcher = FileFetcher(data_path=data_path, parser=parser)
    response = submit_mapred_job_and_wait(
        driver_uri=driver_uri,
        mapper="lambda x: 1",
        reducer="lambda x: [sum(x)]",
        fetcher=fetcher,
        m=100,
        r=20,
    )
    print(response)


if __name__ == "__main__":
    count_records()
```

<figure id="e462" class="graf graf--figure graf--layoutOutsetCenter graf-after--pre">
<img src="/assets/posts/2bed019d9baa895d6791bddffba8c9fe48c76a33.png" class="graf-image" data-image-id="1*l_9X5lgHfnL6udieP4Iueg.png" data-width="2646" data-height="1718" />
</figure>

The `client.py` is waiting for results and should display `[29475453]` after a few minutes. The `wc` command also gives us the same result.

------------------------------------------------------------------------

<figure id="c327" class="graf graf--figure graf--leading">
<img src="/assets/posts/85849b9a5c47f6664cd5cbf2345efaa04adf649e.png" class="graf-image" data-image-id="1*yRXuOYyFEbA-UycLTapCLw.png" data-width="902" data-height="388" />
</figure>

The client interacts with the Driver via the `lib`. The Driver proceeds to break the huge file into start/end offsets for M tasks. Each of these offsets represents a MAP task. The Map tasks are then combined into Reduce tasks, and finally, there is a final task that reduces the Reduce tasks.

<figure id="f5ba" class="graf graf--figure graf-after--p">
<img src="/assets/posts/0aec85ecc83245dba0f6c150d74bd685fb3f8c14.png" class="graf-image" data-image-id="1*gXvA8o6h8aPbPtw9IMau-Q.png" data-width="1130" data-height="434" />
</figure>

*The Map tasks and Reduce tasks are sent to the workers, while the final task is reduced on the Driver. The results of the Map tasks are stored locally on the workers, so the Reduce tasks need to fetch the results from the workers.*

A Reduce task can be assigned to any idle worker, so it needs its parent Map task’s worker to be alive and responding in order to fetch the intermediate results. The diagram above is only schematic; a worker can be assigned a Reduce task with Map tasks from different workers. This means that if a worker dies, and any of the child MAP tasks are not finished, all such MAP tasks need to be marked as pending. Lets try doing this.

> ***Note:*** *For the purposes of this POC, we are cleaning up all Reduce tasks as well. This can be easily fixed with a simple condition.*

<figure id="3f1e" class="graf graf--figure graf--layoutOutsetCenter graf-after--blockquote">
<img src="/assets/posts/d7f95af67e5b59bea0947654093a9a9c0acf07fe.png" class="graf-image" data-image-id="1*FL-XbDdXXSHBXK4J_Oxzig.png" data-width="2642" data-height="1800" />
</figure>

---
<figure id="3e32" class="graf graf--figure graf--layoutOutsetCenter graf-after--figure">
<img src="/assets/posts/368c16dea2c996b36dfb3e02815200fc91f8367c.png" class="graf-image" data-image-id="1*VOSX5NvWSEOH80xrfwlNhw.png" data-width="2580" data-height="1840" />
</figure>

---
<figure id="9373" class="graf graf--figure graf--layoutOutsetCenter graf-after--figure">
<img src="/assets/posts/2bbba5b3547f8ded2cfd2835d15afadafdc97540.png" class="graf-image" data-image-id="1*l8k1ta8D8n9QR4jlLmOqMA.png" data-width="2640" data-height="1790" />
</figure>


*After a long wait we see the Driver go into IDLE state, and the client poller return the result.*

------------------------------------------------------------------------

The code is designed to be easily extensible to support various types of fetchers. Fetcher containers are passed to both the driver and workers, allowing for easy addition of new fetchers. The driver uses `get_chunks_metadata` to divide the MapReduce process into multiple MAP tasks, which are then grouped into subsequent REDUCE tasks. The final REDUCE task is handled by the driver.

``` graf
class Fetcher(ABC):
    def __init__(self, data_path: Optional[str], parser: Optional[RecordParser]):
        self.data_path = data_path
        self.parser = parser

    @abstractmethod
    def get_chunks_metadata(self, num_chunks: int):
        pass

    @abstractmethod
    def get_records_from_metadata(self, chunk_metadata: Any):
        pass

    def pickle(self):
        return base64.b64encode(pickle.dumps(self)).decode("utf-8")
```

------------------------------------------------------------------------

When a worker starts, it must register with the driver. This process is known as the worker “registering with the driver.” Afterward, the worker is required to send periodic heartbeats to the driver. If the driver does not receive a heartbeat within 30 seconds, the worker will be considered inactive, and all of its tasks, including completed ones, will be reassigned as we saw earlier.

The driver assigns any IDLE worker a pending task, ensuring that all of its parent tasks are complete and the task is currently in the PENDING state. This is managed by periodically calling the `rebalance` function on the driver. For this POC, the worker communicates task status, worker status, and other information solely through heartbeats.

Finally, once all tasks are complete, the results can be collated, and the driver can be marked as IDLE again.

------------------------------------------------------------------------

### References

<a href="https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf" class="markup--anchor markup--p-anchor" data-href="https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf" rel="nofollow noopener" target="_blank">https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf</a>

<a href="https://github.com/vmandke/mapred" class="markup--anchor markup--mixtapeEmbed-anchor" data-href="https://github.com/vmandke/mapred" title="https://github.com/vmandke/mapred"><strong>GitHub MapReduce POC Implementation</strong><br />


---
Originally Published on [Medium](https://medium.com/@vmandke) on Jan 01, 2025.
