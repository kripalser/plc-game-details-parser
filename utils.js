// https://vanillajstoolkit.com/helpers/nextuntil/
/*
 * Get all following siblings of each element up to but not including the element matched by the selector
 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
 * @param  {Node}    elem                   The element
 * @param  {String}  selector               The selector to stop at
 * @param  {Boolean} [includeElem=false]    Whether to include the element itself
 * @param  {String}  filter                 The selector to match siblings against [optional]
 * @return {Array}                          The siblings
 */
const nextUntil = (elem, selector, includeElem = false, filter) => {
    // Setup siblings array
    const siblings = [];

    if (elem === undefined) return siblings;

    if (includeElem === false) {
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
/*
 * Get all following siblings of element
 * @param {Node} elem   The element
 * @return {Array}      The siblings
 */
const nextAll = (elem) => {
    const siblings = [];

    if (elem === undefined) return siblings;

    elem = elem.nextElementSibling;

    while (elem) {
        siblings.push(elem);
        elem = elem.nextElementSibling;
    }

    return siblings;
};

module.exports = { nextUntil, nextAll };