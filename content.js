(function () {
  'use strict';

  const resourceList = ['metal', 'crystal', 'deuterium'];

  function getRandomInt(min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(obj) {
    const length = obj.length;
    let index = 0;
    while (index < length) {
      const rnd = getRandomInt(0, index);
      const tmp = obj[index];
      obj[index] = obj[rnd];
      obj[rnd] = tmp;
      index += 1;
    }
  }

  function setOGMALinks(data = []) {
    sessionStorage.setItem('OGMALinks', JSON.stringify(data));
  }

  function ogNumberFormat(x) {
    return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function resetTotals() {
    const resources = {};
    sessionStorage.setItem('OGMATotals', JSON.stringify(resources));
    return resources;
  }

  function getTotals() {
    let resources;
    try {
      resources = JSON.parse(sessionStorage.getItem('OGMATotals'));
    } catch(ignore) {}
    if (resources === null || typeof resources !== 'object') {
      resources = resetTotals();
    }
    return resources;
  }

  function getActive(planets) {
    const active = planets.querySelector('a.active');
    if (active) {
      const match = active.href.match(/cp=(\d+)/);
      if (match) {
        return match[1];
      }
    }
  }

  function getLinkNode(planets, id) {
    return planets.querySelector('a[href*="cp=' + id + '"]');
  }

  function toNumber(nodeId) {
    const node = document.getElementById(nodeId);
    let txt;
    if (node) {
      txt = node.textContent.replace(/\D/g, '');
    }
    return Number(txt) || 0;
  }

  function addTotals(planets) {
    const id = sessionStorage.getItem('OGMAClicked');
    sessionStorage.setItem('OGMAClicked', '');
    const active = getActive(planets);
    if (id && id === active) {
      const resources = getTotals();
      resources[id] = {
        metal: toNumber('resources_metal'),
        crystal: toNumber('resources_crystal'),
        deuterium: toNumber('resources_deuterium')
      };
      sessionStorage.setItem('OGMATotals', JSON.stringify(resources));
    }
  }

  function titleise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function makeTitleHTML(resource) {
    const div = document.createElement('div');
    div.textContent = 'Cycled Resources|';
    const table = document.createElement('table');
    table.className = 'resourceTooltip';
    table.appendChild(document.createElement('tbody'));
    div.appendChild(table);
    for (let type of resourceList) {
      const row = table.insertRow();
      const cell1  = row.insertCell();
      cell1.textContent = titleise(type) + ':';
      const cell2  = row.insertCell();
      const span = document.createElement('span');
      span.className = 'undermark';
      span.textContent = ogNumberFormat(resource[type]);
      cell2.appendChild(span);
    }
    return div.innerHTML;
  }

  function sumTotals(planets, links) {
    const resources = getTotals();
    const totals = {};
    for (let type of resourceList) {
      totals[type] = 0;
    }
    for (let key of Object.keys(resources)) {
      const resource = resources[key];
      for (let type of resourceList) {
        totals[type] += resource[type];
      }
      if (!links.length) {
        const node = getLinkNode(planets, key);
        if (node) {
          const img = node.querySelector('img');
          if (img) {
            img.title = makeTitleHTML(resource);
            img.classList.add('tooltipHTML');
          }
        }
      }
    }
    return totals;
  }

  function getLinks(planets, links) {
    links.length = 0;
    resetTotals();
    for (let node of planets.querySelectorAll('a.planetlink,a.moonlink')) {
      const match = node.href.match(/cp=(\d+)/);
      if (match) {
        links.push(match[1]);
      }
    }
    const order = getRandomInt(0, 2);
    if (order === 2) {
      shuffle(links);
    } else if (order === 1) {
      links.reverse();
    }
    setOGMALinks(links);
  }

  function next(planets, links, fast = 1, slow = 4) {
    if (links.length) {
      const id = links.shift();
      const node = getLinkNode(planets, id);
      setOGMALinks(links);
      if (node) {
        setTimeout(() => {
          sessionStorage.setItem('OGMAClicked', id);
          node.dispatchEvent(new CustomEvent('click'));
        }, getRandomInt(fast, slow) * 1000);
      }
    }
    return true;
  }

  function fresh(planets, links) {
    getLinks(planets, links);
    return next(planets, links);
  }

  function setRunning(node) {
    node.classList.remove('ogma');
    node.classList.add('ogmarun');
    node.title = 'Cycle In Progress';
    node.classList.add('tooltipHTML');
  }

  function appendOgmaLink(node, planets, links, totals) {
    let listener;
    node.id = 'ogmalink';
    if (links.length) {
      setRunning(node);
    } else {
      listener = () => {
        node.removeEventListener('click', listener);
        setRunning(node);
        fresh(planets, links);
      };
      node.classList.remove('ogmarun');
      node.classList.add('ogma');
      node.addEventListener('click', listener, false);
      node.title = makeTitleHTML(totals);
      const div = document.createElement('p');
      const p = document.createElement('p');
      p.textContent = 'Click to start a cycle and sum the resources.';
      div.appendChild(p);
      node.title += div.innerHTML;
      node.classList.add('tooltipHTML');
    }
  }

  function isAutoCycle() {
    let checked;
    try {
      checked = JSON.parse(sessionStorage.getItem('OGMAAuto'));
    } catch(ignore) {}
    return checked === true;
  }

  function appendOgmaCycle(node) {
    const span = document.createElement('span');
    span.id = 'ogmaspan';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'ogmacycle';
    checkbox.title = 'Auto Cycle|Cycle through planets and moons automatically.';
    checkbox.classList.add('tooltipHTML');
    checkbox.checked = isAutoCycle();
    checkbox.addEventListener('change', evt => {
      sessionStorage.setItem('OGMAAuto', JSON.stringify(evt.target.checked));
      if (!evt.target.checked) {
        setOGMALinks();
      }
      timedInit();
    }, false);
    span.appendChild(checkbox);
    const parent = node.parentNode;
    span.appendChild(node);
    parent.insertBefore(span, parent.firstChild);
  }

  function init(force = false) {
    const myPlanets = document.getElementById('myPlanets');
    if (myPlanets) {
      const countColonies = document.getElementById('countColonies');
      if (countColonies) {
        const startNode = myPlanets.querySelector('p');
        if (startNode) {
          let OGMALinks;
          try {
            OGMALinks = JSON.parse(sessionStorage.getItem('OGMALinks'));
          } catch(ignore) {}
          if (!Array.isArray(OGMALinks)) {
            OGMALinks = [];
            setOGMALinks(OGMALinks);
          }
          if (!document.getElementById('ogmalink')) {
            addTotals(myPlanets);
            appendOgmaCycle(startNode);
            appendOgmaLink(startNode, myPlanets, OGMALinks, sumTotals(myPlanets, OGMALinks));
          }
          return force ? fresh(myPlanets, OGMALinks) : next(myPlanets, OGMALinks);
        }
      }
    }
    setOGMALinks();
  }

  function timedInit(min = 15, max = 45, poll = 5) {
    if (!init() || !isAutoCycle()) {
      return;
    }
    const now = Date.now();
    if (now > JSON.parse(sessionStorage.getItem('OGMALast')) + getRandomInt(min * 60000, max * 60000)) {
      sessionStorage.setItem('OGMALast', now);
      init(true);
    }
    setTimeout(timedInit, poll * 60000);
  }

  timedInit();
}());

