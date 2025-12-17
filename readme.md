# JavaScript Frameworks Overhead Comparison

## Motivation

I have seen multiple static websites built with popular JavaScript frameworks, sometimes a single page with simple static content. They were shipping a significant amount of JavaScript code for literally no interaction. I wanted to quantify this overhead and see how different frameworks compare in this regard.

## Methodology

I created an app that renders a single blank page using different JavaScript frameworks. Then, I built each app for production and measured the size of the generated JavaScript bundle.

## Results

![](./scripts/bundle-comparison.svg)
