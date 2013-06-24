## 1,048,576 Particles

[Click here to see the demo](http://soulwire.github.io/WebGL-GPU-Particles/)

An experiment showing 1 million+ particles being moved around on the GPU via WebGL. All data is uploaded once - velocities are computed and integrated entirely on the GPU and state is preserved via a Texture and Framebuffer. You can also control this with LEAP motion if you have one :)

This demo was part of my [Dissecting WebGL](http://www.meetup.com/doctype-html/events/123439792/7) talk ([slides](https://github.com/hugeinc/doctype-meetup/tree/master/dissecting-webgl) and [video](http://new.livestream.com/hugeinc/events/219294) available.)

Treat this as a first teaser of a GPU particle effects / physics library that I'm working on and will open source soon.