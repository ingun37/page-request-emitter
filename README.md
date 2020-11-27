# About

It hooks requests from a puppeteer page, transforms with given mapper, then emits as *Observable*.

# Usage

You can see the complete sample at `test/index.spec.ts`.

```typescript
const browser = puppeteer.launch();
const html = `
<script>
fetch("http://domain.com", "A").then(()=>{
    fetch("http://not-domain.com", "B")
}).then(()=>{
    fetch("http://domain.com", "C")
})
</script>`
streamPageEvents(browser, "http://domain.com", html, async (page:puppeteer.Browser, req:puppeteer.Request) => req.postData()).subscribe({
    next: console.log
})

// output
// A
// C
```
