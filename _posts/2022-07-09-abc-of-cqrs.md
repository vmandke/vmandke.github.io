---
layout: post
title: ABC of CQRS
date: 2022-07-09
---

***An attempt in python***

> Please Note: This was a submission for a coding challenge in September of 2018. The requirement was just to build a parking lot API, however as I was working on AKKA and CQRS at that time, I was inspired to submit a minimal, and definitely lacking cqrs-esque implementation. It has been well over stipulated time to not reveal the problem statement, and the said `company` should change their problem statement if they haven't done so as yet.

Watching this might be useful, before jumping into the code:
[https://www.youtube.com/watch?v=7erJ1DV_Tlo](https://www.youtube.com/watch?v=7erJ1DV_Tlo)

More references: [https://doc.akka.io/docs/akka/current/general/actor-systems.html](https://doc.akka.io/docs/akka/current/general/actor-systems.html)

#### An Actor

Think of a system with 3 processes. A read-side, write-side, and a client context. It helps abstracting out and saying: `an actor is a thread`.
```python
class Actor:
    -- set_in_queue(self, in_queue)
    -- get_in_queue(self)
    -- register_receive(self, command, command_fn)
    -- non_blocking_get(pipe)
    -- blocking_get(self)
    -- put_on_sender(result, sender_queue)
    -- receive(self)
    -- start(self)
```

#### ReadSide/Lot

Read side actors generally implement the read / view commands
```python
class ReadSideLot(Actor):
    -- receive(self):
    -- park(self, car, slot)
    -- leave(self, slot, car)
    -- get_status(self)
    -- get_registration_numbers_for_cars_with_colour(self, color)
    -- get_slot_numbers_for_cars_with_colour(self, color)
    -- get_slot_number_for_registration_number(self, rno)
```

#### WriteSide/Lot

Write side actors implement the create, update, modify commands. Which eventually get reflected to it's mirror.
```python
class WriteSideLot(Actor):
    -- send_read_side_event(self, event)
    -- park(self, rno, color)
    -- leave(self, slot)
```

#### Registries

Registry keeps track of all the actors in the system. Only write side actors get created and read side are eventually mirrored. What ever action write-side takes is sent to its mirror read-side for eventual consistency. I think of this as a actor index system, with its own read-side reflection.
```python
class Registry(Actor):
    -- spawn
    -- ask_forward
    -- kill_actor
```
```python
class WriteSideParkingLotRegistry(Registry):
    -- create_parking_lot
```
```python
class ReadSideParkingLotRegistry(Registry):
    -- create_parking_lot
```

#### Glue/CommandExecuter

This is just an additional helper to pass commands onto the read side / write side processes, and individual actors.
```python
class CommandExecuter():
    -- add_query
    -- add_command
    -- get_command_args_and_id
    -- send_to_sender
    -- execute_command_line
```

#### Tada!

Maybe now it makes more sense to read this test.
The test shows both ways to execute / trigger the read and write side, using the `executer` or `queue`

![Test screenshot](https://cdn-images-1.medium.com/max/800/1*-7k7dKKqvqPqwFsZ-vsGig.png)
---
*find the test here: [https://github.com/vmandke/abc_cqrs/blob/main/tests/test_command_executer.py](https://github.com/vmandke/abc_cqrs/blob/main/tests/test_command_executer.py)*

Find the code here: [https://github.com/vmandke/abc_cqrs](https://github.com/vmandke/abc_cqrs)

***Happy Reading!***

---
Originally Published on [Medium](https://medium.com/@vmandke) on July 9, 2022.