'use strict';

const path = require('path');
const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const yaml = require('js-yaml');
const { nextUntil, nextAll } = require('./utils');

function gameDetailsParser() {
    const readFilePath = process.argv[2];

    if (readFilePath === undefined || path.extname(readFilePath) !== '.html') {
        console.warn('\x1b[33m%s\x1b[0m', 'warning: Please provide a path to an HTML file');
        return;
    }

    if (fs.existsSync(readFilePath) === false) {
        console.error('\x1b[31m%s\x1b[0m', 'error: This file does not exist');
        return;
    }

    const writeFilePath = `${path.dirname(readFilePath)}/${path.basename(readFilePath).replace(path.extname(readFilePath), '.yml')}`;
    let data = {};
    let metaData = {};

    JSDOM
        .fromFile(readFilePath)
        .then((dom) => {
            const document = dom.window.document;
            const meta = nextUntil(document.querySelector('p'), 'h1', true);
            const intro = nextUntil(document.querySelector('h1'), 'h2');
            const expect = nextUntil(document.querySelector('h2'), 'ul');
            const characteristics = document.querySelector('ul');
            const played = nextUntil(document.querySelectorAll('h2')[1], 'h2');
            const odds = nextUntil(document.querySelectorAll('h2')[2], 'h2');
            const symbols = nextUntil(document.querySelectorAll('h2')[3], 'h2');
            const test = nextUntil(document.querySelectorAll('h2')[4], 'h2');
            const advantages = nextUntil(document.querySelectorAll('h2')[5], 'h2');
            const play = nextAll(document.querySelectorAll('h2')[6]);

            // Meta data
            for (const item of meta) {
                const parts = item.textContent.split(': ');

                metaData[parts[0].replace('Game', '').split(/(?=[A-Z])/).join('_').toLowerCase()] = parts[1];
            }

            data.name = metaData.name;
            data.title = metaData.title;
            data.serverId = `${metaData.provider.toLowerCase()}-${metaData.name.replace(/\s/g, '-').toLowerCase()}`;
            data.gameKey = `${metaData.provider.toLowerCase()}_${metaData.name.replace(/\s/g, '_').toLowerCase()}`;
            data.meta_description = metaData.meta_description;
            data.version = 2;
            data.text = {};
            data.text.intro = addItems(intro);
            data.text.expect = addItems(expect);
            data.text.characteristics = addCharacteristics(characteristics);
            data.text.played = addItems(played);
            data.text.odds = addItems(odds);
            data.text.symbols = addSymbols(symbols);
            data.text.test = addItems(test);
            data.text.advantages = addItems(advantages);
            data.text.play = addItems(play);

            fs.writeFile(writeFilePath, yaml.dump(data, { lineWidth: -1 }), (error) => {
                if (error) {
                    console.error(error);
                }
            });
        });
}

function addCharacteristics(list) {
    let result = [];

    for (const item of list.querySelectorAll('li')) {
        const parts = item.textContent.split(': ');
        result.push(`${parts[0]}: ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)}`); // Capitalize first letter of the value
    }

    return result;
}

function addItems(items) {
    return items.map((item) => {
        return item.innerHTML;
    });
}

function addSymbols(items) {
    let result = [];
    let titleIndex = 0;

    for (const [index, item] of items.entries()) {
        if (index % 2 === 0) {
            // Even elements are titles
            result.push({
                key: item.textContent.replace(/\s/g, '').toLowerCase(),
                title: item.textContent,
            });
            titleIndex++;
        } else {
            result[titleIndex - 1].text = item.textContent;
        }
    }

    return result;
}

gameDetailsParser();
