'use strict';

const axios = require('axios');
const chalk = require('chalk');
const { decode } = require('html-entities');
const fs = require('fs');
const jsdom = require('jsdom');
const minify = require('html-minifier').minify;
const path = require('path');
const slugify = require('slugify');
const yaml = require('js-yaml');

const { JSDOM } = jsdom;
const { gameProviders } = require('./game-providers');
const { nextUntil, nextAll, removeEmptyLinks } = require('./utils');

require('dotenv').config();

// https://stackoverflow.com/a/69409483
const argv = (key) => {
    // Return `true` if the key exists and a value is defined
    if (process.argv.includes(`--${key}`)) return true;

    const value = process.argv.find((element) => element.startsWith(`--${key}=`));

    // Return `null` if the key does not exist and a value is not defined
    if (!value) return null;

    return value.replace(`--${key}=`, '');
}

const filePath = process.argv[2];

function readFile() {
    if (filePath === undefined || !(/^\.html?$/).test(path.extname(filePath))) {
        console.log(`${chalk.black.bgRed(' ERROR ')} ${chalk.red('Please provide a path to an HTML file')}`);
        return;
    }

    console.log(`Reading file ${chalk.bold(path.basename(filePath))}`);

    fs.readFile(filePath, 'utf8', (error, data) => {
        if (error) {
            console.log(`${chalk.black.bgRed(' ERROR ')} ${chalk.red('Something went wrong, see details below')}\n${chalk.red(error)}`);
            return;
        }

        parseHTML(data);
    });
}

function parseHTML(html) {
    const { document } = (new JSDOM(cleanHTML(html))).window;
    createDataObject(document);
}

function cleanHTML(html) {
    // Remove all non-breaking spaces before cleaning the HTML
    html = html.replace(/&nbsp;/g, ' ');

    return minify(html, {
        collapseWhitespace: true,
        removeEmptyElements: true,
    });
}

function createDataObject(document) {
    let data = {};
    let metaData = {};
    let provider = {};

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
        const parts = item.textContent.split(/: (.*)/s); // Get only first instance

        metaData[parts[0].replace('Game', '').split(/(?=[A-Z])/).join('_').toLowerCase()] = parts[1];
    }

    provider = gameProviders.find((item) => item.id === slugify(metaData.provider, { replacement: '', lower: true, strict: true }));

    if (!provider) {
        console.log(chalk.red(`Provider ${metaData.provider} couldn't be found in gameProviders`));
        return;
    }

    data.name = metaData.name;
    data.title = metaData.title;

    data.serverId = provider.prefix.urlSlug + (provider.prefix.urlSlug !== '' ? '-' : '') +  slugify(metaData.name, { lower: true, strict: true }); // Fallback
    data.gameKey = provider.prefix.serverId + (provider.prefix.serverId !== '' ? '_' : '') + slugify(metaData.name, { replacement: '', lower: true, strict: true }); // Fallback
    data.meta_description = metaData.meta_description;
    data.version = 2;
    data.text = {};
    data.text.intro = parseItems(intro);
    data.text.expect = parseItems(expect);
    data.text.characteristics = parseCharacteristics(characteristics);
    data.text.played = parseItems(played);
    data.text.odds = parseItems(odds);
    data.text.symbols = parseSymbols(symbols);
    data.text.test = parseItems(test);
    data.text.advantages = parseItems(advantages);
    data.text.advanced = [];
    data.text.play = parseItems(play);

    getGame(provider, data.name)
        .then((game) => {
            if (game) {
                data.serverId = game.urlSlug;
                data.gameKey = game.serverId;
            }

            writeFile(metaData, data);
        })
        .catch((error) => console.log(chalk.red(error)));
}

function writeFile(metaData, data) {
    console.log(`Writing file ${chalk.bold(slugify(metaData.name, { lower: true, strict: true }) + '.yml')}`);

    fs.writeFile(`${path.dirname(filePath)}/${slugify(metaData.name, { lower: true, strict: true })}.yml`, yaml.dump(data, { lineWidth: -1 }), (error) => {
        if (error) {
            console.log(chalk.red(error));
        } else {
            console.log(`${chalk.black.bgGreen(' DONE ')} ${chalk.green('File written successfully')}`);
        }
    });
}

function parseCharacteristics(list) {
    let result = [];

    for (const item of list.querySelectorAll('li')) {
        const parts = item.textContent.split(': ');
        result.push(`${parts[0]}: ${parts[1].charAt(0).toUpperCase() + parts[1].slice(1)}`); // Capitalize first letter of the value
    }

    return result;
}

function parseItems(items) {
    return items.map((item) => {
        if (item.tagName === 'OL' || item.tagName === 'UL') {
            return parseItems([...item.childNodes]);
        }

        removeEmptyLinks(item);

        return decode(item.innerHTML);
    });
}

function parseSymbols(items) {
    let result = [];
    let titleIndex = 0;

    for (const [index, item] of items.entries()) {
        if (index % 2 === 0) {
            // Even elements are titles
            result.push({
                key: slugify(item.textContent, { replacement: '', lower: true, strict: true }),
                title: item.textContent,
            });
            titleIndex++;
        } else {
            result[titleIndex - 1].text = item.textContent;
        }
    }

    return result;
}

function getGame(provider, gameName, page = 0) {
    // Skip the request, e.g. for testing purposes
    if (argv('skip-api') === true) return Promise.resolve(null);

    const request = {
        url: process.env.GAMES_API,
        params: {
            vendor: provider.dbName,
            mobile: false,
            orderBy: 'name',
            sortOrder: 'asc',
            page,
        },
    };

    if (!request.url) {
        return Promise.reject('GAMES_API variable in .env is missing or empty');
    }

    if (!request.params.vendor) {
        return Promise.reject(`Provider with ID of ${chalk.bold(provider.id)} couldn't be found in gameProviders`);
    }

    page === 0 && console.log(`Searching for ${chalk.bold(gameName)} game in ${axios.getUri({ url: request.url, params: request.params})}`);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`Checking page ${page}...`);

    return axios
        .get(request.url, { params: request.params })
        .then((response) => {
            const games = response.data;

            if (games.length < 2) {
                // It's nothing really empty because of `loadmore`
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                console.log(`${chalk.black.bgYellow(' WARNING ')} ${chalk.yellow(`No games of ${provider.name} were found`)}`);
                return null;
            }

            const game = games.find((item) => {
                return item.type === 'game' && slugify(item.name, { replacement: '', lower: true, strict: true }) === slugify(gameName, { replacement: '', lower: true, strict: true });
            });

            if (game) {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                console.log(`${chalk.black.bgGreen(' FOUND ')} ${chalk.green(game.name)}`);

                return game;
            } else if (games.find((item) => item.type === 'loadmore').items > 0) {
                page++;
                return getGame(provider, gameName, page);
            } else {
                process.stdout.clearLine();
                process.stdout.cursorTo(0);
                console.log(`${chalk.black.bgRed(' NOT FOUND ')} ${chalk.red(`serverId and gameKey for this game will be generated automatically`)}`);
                return null;
            }
        })
        .catch((error) => {
            console.error(chalk.red(error));
        });
}

readFile();
