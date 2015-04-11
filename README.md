[![Build Status](https://travis-ci.org/nordstrand/offly.svg?branch=master)](https://travis-ci.org/nordstrand/offly)
# Offly

A multi-purpose tool for capturing high fidelity static reproductions of highly dynamic web sites.

Based on filternet.js and PhantomJS.

### Usage examples
#### Serializing a site to file
```bash
$ node index.js scrape --crawl_url=https://news.ycombinator.com/  --recursive hacker-news.json
Dumping http traffic to hacker-news.json.
Getting: https://news.ycombinator.com/
Getting: http://www.ycombinator.com/apply/
Getting: http://www.nytimes.com/interactive/2013/10/08/science/the-higgs-boson.html#/?g=true&higgs1_slide=0
^C
Closing hacker-news.json
```
#### Serving same site from file
```bash
$ node index.js serve hacker-news.json                                                                                                      
'What Is the Higgs? - Interactive Graphic - NYTimes.com' [168.5 kB] 
http://localhost:8128/interactive/2013/10/08/science/the-higgs-boson.html

'Hacker News' [23.6 kB] 
http://localhost:8128/

Serving 102 http transaction(s) in file hacker-news.json on port 8128
```

### Architecture

For capturing a reproduction Offly spins up a proxy that intercepts and records all traffic going through it. Traffic can either be triggered manually through a web browser or programatically by Offly itself.

A reproduction can be served through a browser (intercepting proxy) or as a static web server.

There are extension points for applying custom code (_transforms_) on http traffic at record/serv-time.


```
                           +-------------------+                           
                           | Webdriver         |                           
                           | (wd.js)           |                           
                           +-------------------+                           
                                                                           
 +-----------------------+ +-------------------+                           
 | Web browser           | | PhantomJS         |                           
 | (manually operated)   | |                   |                           
 +-----------------------+ +-------------------+                           
                                                                           
 +---------------------------------------------+      +-----------------+  
 | HTTP proxy                                  |<---->| Persistence     |  
 | (filternet.js)                              |      |                 |  
 +---------------------------------------------+      +-----------------+  
++---------------------------------------------+------+--------------------
                                                                           
 +------------+                                                            
 | Web site   |                                                            
 |            |                                                            
 +------------+                                                            
```
