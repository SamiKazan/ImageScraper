import puppeteer from "puppeteer"
import axios from "axios"
import fs from "fs"
import path from "path"

const getImages = async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
    })

    const downloadTo = './images'

    if (!fs.existsSync(downloadTo)) {
        fs.mkdirSync(downloadTo)
    }
    const existingFilesLength = fs.readdirSync(downloadTo).length

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
        for (let i = 0; i < filteredLinks.length; i++) {
            let number = existingFilesLength + i
            const filename = `kuva-${number + 1}.jpeg`
            await DownloadImage(filteredLinks[i], filename, folder)
        }
    }

    let link_list = []

    const page = await browser.newPage()

    await page.goto("https://radiopaedia.org/cases/orbital-cellulitis-11?lang=us")

    const thumbImages = await page.evaluate(() => {
        const images = document.querySelectorAll('img[src$="thumb.jpeg"]')
        return Array.from(images).map(img => img.src)
    })

    for (let i = 0; i < thumbImages.length; i++) {

        const subfolder = path.join(downloadTo, `set-${i}`)
        if (!fs.existsSync(subfolder)) {
            fs.mkdirSync(subfolder)
        }

        await page.evaluate((src) => {
            const img = document.querySelector(`img[src="${src}"]`)
            if (img) img.click()
        }, thumbImages[i])

        const imageLinks = await page.evaluate(() => {
            const links = document.querySelectorAll('link[rel="preload"]')
            return Array.from(links).map(link => link.href)
        })
        
        link_list.push(...imageLinks)

        const filteredLinks = link_list.filter(link => link.endsWith('big_gallery.jpeg'))

        link_list = []

        DownloadAll(filteredLinks, subfolder)
    }

    await browser.close()

}

getImages()