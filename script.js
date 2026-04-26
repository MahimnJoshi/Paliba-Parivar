document.addEventListener("DOMContentLoaded", function () {
  const popup = document.getElementById("popup");
  const closeBtn = document.getElementById("closeBtn");
  const popupContent = document.querySelector(".popup-content");

  closeBtn.onclick = () => popup.style.display = "none";
  popup.onclick = () => popup.style.display = "none";
  popupContent.onclick = (e) => e.stopPropagation();

  fetch("data.json")
    .then(res => res.json())
    .then(data => {
      const width = 1400;   
      const height = 900; // Increased height to accommodate more vertical staggering

      const svg = d3.select("#tree")
        .append("svg")
        .attr("width", "100%")
        .attr("height", height);

      const g = svg.append("g");

      svg.call(d3.zoom().on("zoom", (event) => {
        g.attr("transform", event.transform);
      }));

      const root = d3.hierarchy(data);

      // 🎯 Even narrower nodeSize (60) to compress it further
      const treeLayout = d3.tree().nodeSize([60, 150]);
      treeLayout(root);

      // 🌳 COMPREHENSIVE STAGGERING LOGIC
      root.descendants().forEach((d, i) => {
        let baseHeight = (height - 150) - (d.depth * 140);
        
        if (d.depth === 1) {
          // Stagger the 4 main brothers/branches
          // Bhanuprasad & Vinodbhai stay low, Mahindrabhai & Rameshchandra move higher
          d.y = i % 2 === 0 ? baseHeight : baseHeight - 80;
        } else if (d.depth > 1) {
          // Stagger all subsequent generations
          d.y = i % 2 === 0 ? baseHeight : baseHeight - 45;
        } else {
          // Root (Umiyashankar) stays at base
          d.y = baseHeight;
        }
      });

      const centerX = width / 2;
      const rootX = root.x;
      root.descendants().forEach(d => {
        d.x = d.x - rootX + centerX;
      });

      // BRANCHES (Using smooth Bezier curves)
      g.selectAll("path")
        .data(root.links())
        .enter()
        .append("path")
        .attr("d", d => {
          return `M${d.source.x},${d.source.y}
                  C${d.source.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${d.target.y}`;
        })
        .attr("stroke", "#5d4037")
        .attr("fill", "none")
        .attr("stroke-width", d => (root.height - d.source.depth + 1) * 2);

      // NODES
      const nodes = g.selectAll(".node-group")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node-group")
        .on("click", function (event, d) {
          event.stopPropagation();
          document.getElementById("p-name").textContent = d.data.name || "N/A";
          document.getElementById("p-age").textContent = d.data.age || "N/A";
          document.getElementById("p-born").textContent = d.data.born || "N/A";
          document.getElementById("p-occupation").textContent = d.data.occupation || "N/A";

          const deathElem = document.getElementById("p-death");
          if (d.data.death) {
            deathElem.parentElement.parentElement.style.display = "block";
            deathElem.textContent = d.data.death;
          } else {
            deathElem.parentElement.parentElement.style.display = "none";
          }
          popup.style.display = "flex";
        });

      nodes.append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => d.children ? 7 : 4)
        .attr("fill", d => d.depth === 0 ? "#1b5e20" : "#388e3c");

      // TEXT (Clean first names only for the tree view)
      nodes.append("text")
        .attr("x", d => d.x)
        .attr("y", d => d.y - 12)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("font-weight", "600")
        .text(d => d.data.name.split(' ')[0]);

      // POT (Repositioned slightly for the new scale)
      const potWidth = 160;
      const potHeight = 60;
      const potGroup = g.append("g");

      potGroup.append("rect")
        .attr("x", root.x - potWidth / 2)
        .attr("y", root.y + 10)
        .attr("width", potWidth)
        .attr("height", potHeight)
        .attr("rx", 15)
        .attr("fill", "#c19a6b");

      potGroup.append("text")
        .attr("x", root.x)
        .attr("y", root.y + 45)
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .style("fill", "#5d4037")
        .style("font-size", "14px")
        .text("Joshi Parivar");

    });
});