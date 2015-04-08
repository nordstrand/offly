[![Build Status](https://travis-ci.org/nordstrand/offly.svg?branch=master)](https://travis-ci.org/nordstrand/offly)
# Offly

A multi-purpose tool for capturing high fidelity static reproductions of highly dynamic web sites.

Based on filternet.js and PhantomJS.

### Usage

For generating a reproduction Offly spins up a proxy that intercepts and records all traffic going through it. Traffic can either be triggered manually through a web browser or programatically.

A reproduction can be served through a browser (intercepting proxy) or as a static web server.

### Architecture

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
