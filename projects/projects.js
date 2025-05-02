import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

console.log("🔥 projects.js is running");

import { fetchJSON, renderProjects } from '../global.js';

let selectedIndex = -1;
let pieData = [];

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

function getFilteredProjects() {
  return projects.filter(project => {
    const matchesQuery = Object.values(project).join('\n').toLowerCase().includes(query.toLowerCase());
    const matchesYear = selectedIndex === -1 || project.year === pieData[selectedIndex].label;
    return matchesQuery && matchesYear;
  });
}

// 🔢 Count and update title
const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  titleElement.textContent = `${projects.length} Projects`;
}

function renderPieChart(projectsGiven) {
  // Clear existing pie chart and legend
  let newSVG = d3.select('#projects-pie-plot');
  newSVG.selectAll('path').remove();
  d3.select('.legend').selectAll('li').remove();

  // Recalculate grouped data
  let rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  );

  let data = rolledData.map(([year, count]) => ({
    label: year,
    value: count
  }));
  pieData = data;

  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(data);
  let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  let arcs = arcData.map(d => arcGenerator(d));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcs.forEach((arc, i) => {
    newSVG
      .append('path')
      .attr('d', arc)
      .attr('transform', 'translate(0, 0)')
      .attr('fill', colors(i))
      .attr('class', i === selectedIndex ? 'selected' : '')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;
        renderPieChart(getFilteredProjects());
  
        // // Re-apply selection classes to all legend items
        // d3.select('.legend')
        //   .selectAll('li')
        //   .attr('class', (_, idx) => (
        //     idx === selectedIndex ? 'legend-item selected' : 'legend-item'
        //   ));
      });
  });
  

  let legend = d3.select('.legend');
  data.forEach((d, idx) => {
    legend.append('li')
      .attr('class', idx === selectedIndex ? 'legend-item selected' : 'legend-item')
      .attr('style', `--color:${colors(idx)}`)
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });  

  if (selectedIndex === -1) {
    renderProjects(projectsGiven, projectsContainer, 'h2');
  } else {
    const selectedYear = data[selectedIndex].label;
  
    const filtered = projectsGiven.filter(p => p.year === selectedYear);
  
    renderProjects(filtered, projectsContainer, 'h2');
  }
}

// Call this function on page load
renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');
let query = '';

searchInput.addEventListener('change', (event) => {
  query = event.target.value;
  renderPieChart(getFilteredProjects());
  let filtered = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  renderPieChart(filtered); 
});