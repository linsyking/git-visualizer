'use strict';

// TODO : move inside the iife
var ws, network, nodesDataSet, edgesDataSet, nodes, edges, selectedNode, nodesMap = new Map();

const lastOp = () => showAll();

let visibleType = {
  blob: true,
  tree: true,
  commit: true,
  branch: true,
  head: true
};

function getTree(visible) {
  visibleType = visible;

  $("#graph")
    .width($('.right-panel').width())
    .height($(document).height());

  get('/tree')
    .then(data => {
      console.log(data);

      if (data.error) {
        alert(data.error);
        return;
      }

      nodes = data.nodes;
      edges = data.edges;

      nodes.forEach(node => {
        processNode(node);
        nodesMap.set(node.id, node);
      });

      edges.forEach(processEdge);

      const improvedLayout = nodes.length < 150;

      nodesDataSet = new vis.DataSet(nodes.filter(x => visibleType[x.type]));
      edgesDataSet = new vis.DataSet(edges);

      let head = nodes.find(x => x.id === 'HEAD');
      selectedNode = head ? "HEAD" : "master";
      lastOp();

      // graph network
      const container = document.getElementById('graph');
      const graphData = {
        nodes: nodesDataSet,
        edges: edgesDataSet
      };

      var options = {
        layout: {
          // randomSeed: 6333,
          improvedLayout: improvedLayout
        },
        height: '100%',
        width: '100%'
      };

      network = new vis.Network(container, graphData, options);

      network.on("doubleClick", function (params) {
        var node = params.nodes[0];

        if (!node) return;
        get('/nodedata/' + node)
          .then(node => {
            console.log(node);
            console.log(node.data);
          });
      });

      network.on("click", function (params) {
        var node = params.nodes[0];

        if (!node) return;
        selectedNode = node;
      });
    });

  openWSConnection();
}

function openWSConnection() {
  ws = new WebSocket(`ws://${window.location.host}`);
  ws.onmessage = function (event) {
    let results = JSON.parse(event.data);

    if (!Array.isArray(results)) results = [results];

    results.forEach(res => {
      let type = res.type;
      switch (type) {
        case 'addnode':
          addNode(res.data);
          addOriginalNode(res.data);
          break;
        case 'removenode':
          removeNode(res.data);
          removeOriginalNode(res.data);
          break;
        case 'addedge':
          addEdge(res.data);
          addOriginalEdge(res.data);
          break;
        case 'removeedge':
          removeEdge(res.data);
          removeOriginalEdge(res.data);
          break;
      }
    });
  };
}

function addNode(data) {
  processNode(data);
  log('addNode : ', data);
  if (isNodeChanged(data)) nodesDataSet.update(data);
}

function removeNode(data) {
  log('removeNode : ', data);
  nodesDataSet.remove(data.id);
}

function addEdge(data) {
  processEdge(data);
  log('addEdge : ', data);
  edgesDataSet.update(data);
}

function removeEdge(data) {
  log('removeEdge : ', data);
  data.id = `${data.from}_${data.to}`;
  edgesDataSet.remove(data.id);
}

function addOriginalNode(data) {
  const index = nodes.findIndex(node => node.id == data.id);
  if (index === -1) {
    nodes.push(data);
    nodesMap.set(data.id, data);
  } else {
    Object.assign(nodes[index], data);
  }
}

function removeOriginalNode(data) {
  let index = nodes.findIndex(node => node.id == data.id);
  (index > -1) && nodes.splice(index, 1);
  nodesMap.delete(data.id);
}

function addOriginalEdge(data) {
  const id = `${data.from}_${data.to}`;
  const index = edges.findIndex(edge => edge.id == id);
  (index === -1) && edges.push(data);
}

function removeOriginalEdge(data) {
  const id = `${data.from}_${data.to}`;
  const index = edges.findIndex(edge => edge.id == id);
  (index > -1) && edges.splice(index, 1);
}

function get(url) {
  return new Promise(function (resolve, reject) {
    $.ajax(url).done(resolve).catch(reject);
  });
}

function showAll() {
  nodes.forEach(node => {
    if (visibleType[node.type]) {
      addNode(node);
    } else {
      removeNode(node);
    }
  });
  // nodes.filter(node => visibleType[node.type]).forEach(addNode);
}

function showHideType(visible) {
  visibleType = visible;

  lastOp();
}

function log(a, b) {
  // b ? console.log(a, b) : console.log(a);
}

function isNodeChanged(node) {
  const orig = nodesMap.get(node.id);
  if (!orig) return true;
  return node.type === orig.type && node.label === orig.label;
}
