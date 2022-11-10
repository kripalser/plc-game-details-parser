// https://vanillajstoolkit.com/helpers/nextuntil/
/*!
 * Get all following siblings of each element up to but not including the element matched by the selector
 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Node}    elem                   The element
 * @param  {String}  selector               The selector to stop at
 * @param  {Boolean} [includeFirst=false]   Whether to get also the first element
 * @param  {String}  filter                 The selector to match siblings against [optional]
 * @return {Array}                          The siblings
 */
const nextUntil = (elem, selector, includeFirst = false, filter) => {

    // Setup siblings array
    var siblings = [];

    if (elem === undefined) return siblings;

    if (includeFirst === false) {
        // Get the next sibling element
        elem = elem.nextElementSibling;
    }

    // As long as a sibling exists
    while (elem) {

        // If we've reached our match, bail
        if (elem.matches(selector)) break;

        // If filtering by a selector, check if the sibling matches
        if (filter && !elem.matches(filter)) {
            elem = elem.nextElementSibling;
            continue;
        }

        // Otherwise, push it to the siblings array
        siblings.push(elem);

        // Get the next sibling element
        elem = elem.nextElementSibling;

    }

    return siblings;

};

// https://gist.github.com/firestar300/317d8f0cb7b6764346fe02c9223db9d1
const nextAll = (elem) => {
    const nextElements = [];
    let nextElement = elem;

    if (elem === undefined) return nextElements;

    while (nextElement.nextElementSibling) {
        nextElements.push(nextElement.nextElementSibling);
        nextElement = nextElement.nextElementSibling;
    }

    return nextElements;
};

module.exports = { nextUntil, nextAll };