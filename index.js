import puppeteer from "puppeteer"
import axios from "axios"
import fs from "fs"
import path from "path"
import readline from "readline/promises"
import { stdin as input, stdout as output } from "process"

const rl = readline.createInterface({ input, output })

const getImages = async (url) => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    })

    const downloadTo = './images'

    if (!fs.existsSync(downloadTo)) {
        fs.mkdirSync(downloadTo)
    }

    const DownloadImage = async (url, filename, folder) => {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' })
            const filePath = path.join(folder, filename)
            fs.writeFileSync(filePath, response.data)
        } catch (error) {
            console.error(`ERROR ${filename}:`, error)
        }
    }

    const DownloadAll = async (filteredLinks, folder) => {
        const existingFilesLength = fs.existsSync(folder) ? fs.readdirSync(folder).length : 0
        for (let i = 0; i < filteredLinks.length; i++) {
            let number = existingFilesLength + i
            const filename = `kuva-${number + 1}.jpeg`
            await DownloadImage(filteredLinks[i], filename, folder)
        }
    }

    const page = await browser.newPage()

    await page.goto(url)

    const thumbImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img[src$="thumb.jpeg"], img[src$="thumb.jpg"]')
        return Array.from(images).map(img => img.src)
    })

    for (let i = 0; i < thumbImages.length; i++) {

        // Add functionality to check if subfolder already exists
        const subfolder = path.join(downloadTo, `set-${i}`)
        if (!fs.existsSync(subfolder)) {
            fs.mkdirSync(subfolder)
        }

        await page.evaluate((src) => {
            const img = document.querySelector(`img[src="${src}"]`)
            if (img) img.click()
        }, thumbImages[i])

        // Add functionality to pseudo scroll with puppetteer to preload all images
        const imageLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('link[rel="preload"][as="image"]')
            return Array.from(links).map(link => link.href)
        });
        console.log(imageLinks, "imagelink", imageLinks.length)

        
        const filteredLinks = imageLinks.filter(link => 
            !link.endsWith("thumb.jpg") && !link.endsWith("thumb.jpeg")
        )
        filteredLinks.sort()
        await DownloadAll(filteredLinks, subfolder)
    }

    await browser.close()
}

const main = async () => {
    const url = await rl.question("Paste the URL to the website: ")
    await getImages(url)
    rl.close()
}

main()