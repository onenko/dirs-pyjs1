const rootHierarchies = [];

function renderPage(rootHierarchies) {
    const container = document.getElementById("content");
    container.innerHTML = "";

    // Header
    const header = document.createElement("h2");
    header.textContent = "Some Header";
    container.appendChild(header);

    // Root list
    const ul = document.createElement("ul");
    for (const { name } of rootHierarchies) {
        const li = document.createElement("li");
        li.appendChild(createRootLink(name));
        ul.appendChild(li);
    }
    container.appendChild(ul);

    // Render each hierarchy
    for (const root of rootHierarchies) {
        container.appendChild(renderHierarchy(root));
    }
}

function renderHierarchy(rootEntry) {
    const section = document.createElement("section");

    const title = document.createElement("h3");
    title.id = rootEntry.name;
    title.textContent = rootEntry.name;
    section.appendChild(title);

    const list = document.createElement("div");
    renderNode(rootEntry.hierarchy, list, 0);
    section.appendChild(list);

    return section;
}

function renderNode(node, container, depth) {
    if (!node.childs) return;

    for (const child of node.childs) {
        const line = document.createElement("div");
        line.style.paddingLeft = (depth * 20) + "px";

        const nameLink = createNodeLink(child);

        if (child.type === "file") {
            line.append(
                formatDate(child.timestamp), " ",
                formatSize(child.size), " ",
                nameLink
            );
        } else {
            line.append(
                formatDate(child.timestamp || ""), " ",
                nameLink
            );
        }

        container.appendChild(line);

        if (child.type === "directory") {
            renderNode(child, container, depth + 1);
        }
    }
}

function createRootLink(rootName) {
    const a = document.createElement("a");
    a.href = `#${rootName}`;
    a.textContent = rootName;
    return a;
}

function createNodeLink(node) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = node.name;
    a.onclick = (e) => {
        e.preventDefault();
        console.log("Node:", node);
    };
    return a;
}

function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts * 1000).toLocaleString();
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// For DIR Navigation

function parsePath() {
    const hash = location.hash.slice(1);
    return hash ? hash.split("/") : [];
}

function getDirectoryByPath(rootHierarchy, path) {
    let current = rootHierarchy.hierarchy;

    for (let i = 1; i < path.length; i++) {
        const name = path[i];
        const next = current.childs.find(
            n => n.type === "directory" && n.name === name
        );
        if (!next) return null;
        current = next;
    }
    return current;
}

function renderDirectory(rootEntry, dirNode, fullPath) {
    const container = document.getElementById("content");
    container.innerHTML = "";

    // Title
    const title = document.createElement("h3");
    title.textContent = fullPath.join("/");
    container.appendChild(title);

    // List only immediate children
    for (const child of dirNode.childs) {
        const line = document.createElement("div");

        const date = formatDate(child.timestamp);
        line.append(date, " ");

        if (child.type === "file") {
            line.append(formatSize(child.size), " ");
            line.append(createFileLink(child));
        } else {
            line.append(createDirLink(rootEntry.name, fullPath, child));
        }

        container.appendChild(line);
    }
}

function createDirLink(rootName, fullPath, dirNode) {
    const a = document.createElement("a");
    a.href = `#${[rootName, ...fullPath.slice(1), dirNode.name].join("/")}`;
    a.textContent = dirNode.name;
    return a;
}

function createFileLink(fileNode) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = fileNode.name;
    a.onclick = e => {
        e.preventDefault();
        console.log("File:", fileNode);
    };
    return a;
}


function getDirectoryChain(rootEntry, path) {
    const chain = [];
    let current = rootEntry.hierarchy;

    chain.push({
        path: [rootEntry.name],
        dir: current
    });

    for (let i = 1; i < path.length; i++) {
        const next = current.childs.find(
            n => n.type === "directory" && n.name === path[i]
        );
        if (!next) break;

        current = next;
        chain.push({
            path: path.slice(0, i + 1),
            dir: current
        });
    }

    return chain;
}

function renderDirectorySection(rootName, dirNode, path) {
    const section = document.createElement("section");
    section.id = path.join("/");

    section.appendChild(createBreadcrumbHeader(path));

    for (const child of dirNode.childs) {
        const line = document.createElement("div");

        line.append(formatDate(child.timestamp), " ");

        if (child.type === "file") {
            line.append(formatSize(child.size), " ");
            line.append(createFileLink(child));
        } else {
            line.append(createDirLink(rootName, path, child));
        }

        section.appendChild(line);
    }

    return section;
}


function createDirLink(rootName, path, dirNode) {
    const fullPath = [...path, dirNode.name].join("/");

    const a = document.createElement("a");
    a.href = `#${fullPath}`;
    a.textContent = dirNode.name;
    return a;
}

//
function renderInitialPage() {
    if (!rootHierarchies.length) return;

    const container = document.getElementById("content");
    container.innerHTML = "";

    const path = parsePath();

    // Always render root list
    renderRootList(false);

    // NO HASH -> render EVERYTHING
    if (!path.length) {
        for (const rootEntry of rootHierarchies) {
            renderDirectoryTree(
                rootEntry.name,
                rootEntry.hierarchy,
                [rootEntry.name],
                container
            );
        }
        return;
    }

    // HASH -> render only chain to that directory
    const rootName = path[0];
    const rootEntry = rootHierarchies.find(r => r.name === rootName);
    if (!rootEntry) return;

    const chain = getDirectoryChain(rootEntry, path);

    for (const item of chain) {
        container.appendChild(
            renderDirectorySection(rootEntry.name, item.dir, item.path)
        );
    }
}


function renderDirectoryTree(rootName, dirNode, path, container) {
    // Render THIS directory
    container.appendChild(
        renderDirectorySection(rootName, dirNode, path)
    );

    // Recurse into subdirectories
    for (const child of dirNode.childs) {
        if (child.type === "directory") {
            renderDirectoryTree(
                rootName,
                child,
                [...path, child.name],
                container
            );
        }
    }
}





//
function renderRootList(clear = true) {
    const container = document.getElementById("content");
    if (clear) container.innerHTML = "";

    const h = document.createElement("h3");
    h.textContent = "Some Header";
    container.appendChild(h);

    for (const r of rootHierarchies) {
        const a = document.createElement("a");
        a.href = `#${r.name}`;
        a.textContent = r.name;

        const div = document.createElement("div");
        div.appendChild(a);
        container.appendChild(div);
    }
}

function createBreadcrumbHeader(path) {
    const h = document.createElement("h3");

    path.forEach((part, index) => {
        if (index > 0) {
            h.append(" / ");
        }

        const a = document.createElement("a");
        a.textContent = part;
        a.href = "#" + path.slice(0, index + 1).join("/");
        h.appendChild(a);
    });

    return h;
}











function buildHierarchy(records) {
    const nodes = new Map();
    const root = { type: "directory", name: "root", childs: [] };

    nodes.set("root", root);

    for (const [parentRef, timestamp, sizeOrId, name] of records) {
        const isDir = sizeOrId === 0;

        const node = isDir
            ? { type: "directory", name, timestamp, childs: [] }
            : { type: "file", name, timestamp, size: sizeOrId };

        const key = isDir ? `${name}#${sizeOrId}` : Symbol();

        node.__parentRef = parentRef;
        nodes.set(key, node);
    }

    for (const node of nodes.values()) {
        if (!node.__parentRef) continue;

        const parent = nodes.get(node.__parentRef);
        if (!parent) {
            throw new Error("Missing parent: " + node.__parentRef);
        }

        parent.childs.push(node);
        delete node.__parentRef;
    }

    return root;
}

function loadRoot(rootName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `js/${rootName}.js`;

        script.onload = () => {
            const records = window[rootName];
            if (!records) {
                reject(`No data found for ${rootName}`);
                return;
            }

            const hierarchy = buildHierarchy(records);
            resolve(hierarchy);
        };

        script.onerror = () => reject(`Failed to load ${rootName}.js`);

        document.head.appendChild(script);
    });
}


async function loadAllRoots() {
    for (const rootName of ROOT_NAMES) {
        const hierarchy = await loadRoot(rootName);
        rootHierarchies.push({
            name: rootName,
            hierarchy
        });
    }

    console.log("All hierarchies loaded:", rootHierarchies);
}

loadAllRoots().then(() => {
    renderInitialPage(); // single initial render
});

