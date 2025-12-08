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
    renderPage(rootHierarchies);
});

