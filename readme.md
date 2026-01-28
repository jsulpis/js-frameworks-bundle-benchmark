# JavaScript Frameworks Bundle Size Benchmark

_aka: what framework should I use for a static website ?_

## Disclaimers

- All mentioned frameworks are great. Some are just better suited for complex apps and a bit overkill for simple websites.
- I'm not sure I will maintain this repo with future versions. Check if the versions used are still relevant when you read this.

## Motivation

I always pay attention to the bundle size of my apps and websites, for performance and environmental sustainability reasons. In a large and dynamic app, a lot of JavaScript code is often needed for the many features. But in static websites, it mostly comes from the frameworks and libraries used (if there is a lot of JavaScript code in a static website it's probably not necessary, otherwise it's probably not a static website).

In that regard, I wanted to quantify the impact of each modern framework in terms of bundle size.

## Methodology

With each framework, I created an app that renders a single blank page. I only kept the code that would typically be used in a real world app (routing, SEO tags, error handling etc). I used SSG when available, otherwise a regular SPA. Then, I built each app for production and measured the size of the generated JavaScript bundle.

## Results

**uncompressed size**: allows to better see the amount of code that will be parsed and executed by the browser
**compressed size**: weight of the bundle on the network (although we don't see here the number and size of the individual chunks, which affect download speed)

![](./scripts/bundle-comparison.svg)
