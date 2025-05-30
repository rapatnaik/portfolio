import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));
  
    return data;
}

function processCommits(data) {
    return d3
      .groups(data, (d) => d.commit)
      .map(([commit, lines]) => {
        let first = lines[0];
        let { author, date, time, timezone, datetime } = first;
        let ret = {
          id: commit,
          url: 'https://github.com/vis-society/lab-7/commit/' + commit,
          author,
          date,
          time,
          timezone,
          datetime,
          hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
          totalLines: lines.length,
        };
  
        Object.defineProperty(ret, 'lines', {
          value: lines,
          // What other options do we need to set?
          // Hint: look up configurable, writable, and enumerable
        });
  
        return ret;
      });
}

function getTimeOfDay(hour) {
    if (hour >= 5 && hour < 12) return 'Morning';
    if (hour >= 12 && hour < 17) return 'Afternoon';
    if (hour >= 17 && hour < 22) return 'Evening';
    return 'Night';
}

function renderCommitInfo(data, commits) {
    const container = d3.select('#stats');
    container.selectAll('*').remove();
    
  
    const stats = [
      { label: 'COMMITS', value: commits.length },
      { label: 'FILES', value: new Set(data.map(d => d.file)).size },
      { label: 'TOTAL LOC', value: data.length },
      { label: 'MAX DEPTH', value: d3.max(data, d => d.depth) },
      { label: 'LONGEST LINE', value: d3.max(data, d => d.length) },
      { label: 'MAX LINES', value: d3.max(
        d3.rollup(data, v => v.length, d => d.file),
        ([, lines]) => lines
      )}
    ];
  
    const statDivs = container.selectAll('.stat-block')
      .data(stats)
      .enter()
      .append('div')
      .attr('class', 'stat-block');
  
    statDivs.append('div')
      .attr('class', 'stat-label')
      .text(d => d.label);
  
    statDivs.append('div')
      .attr('class', 'stat-value')
      .text(d => d.value);
}

  
let data = await loadData();
let commits = processCommits(data);
  
// calculate stats here
const numFiles = new Set(data.map(d => d.file)).size;

const fileLineCounts = d3.rollup(data, v => v.length, d => d.file);
const longestFile = [...fileLineCounts.entries()].reduce((a, b) => b[1] > a[1] ? b : a);

const avgLineLength = d3.mean(data, d => d.length);

const timeBuckets = d3.rollup(data, v => v.length, d => getTimeOfDay(new Date(d.datetime).getHours()));
const mostActiveTime = [...timeBuckets.entries()].reduce((a, b) => b[1] > a[1] ? b : a)[0];

renderCommitInfo(data, commits);


// step 2

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;

    const svg = d3
      .select('#chart')
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');
    
    xScale = d3
      .scaleTime()
      .domain(d3.extent(commits, (d) => d.datetime))
      .range([0, width])
      .nice();
      
    yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

    const margin = { top: 0, right: 10, bottom: 0, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 25]); // adjust these values based on your experimentation
    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

    // Add gridlines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    const dots = svg.append('g').attr('class', 'dots');

    dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id) // change this line
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .attr('fill', 'steelblue')
    .on('mouseenter', function (event, commit) {
      d3.select(this)
        .classed('hovered', true)
        .transition()
        .duration(150)
        .attr('r', (d) => rScale(d.totalLines) * 1.5)  // scale radius
        .style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', function () {
      d3.select(this)
        .classed('hovered', false)
        .transition()
        .duration(150)
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
        
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis') // new line to mark the g tag
    .call(xAxis);

    // Add Y axis
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .attr('class', 'y-axis') // just for consistency
      .call(yAxis);

    svg.append('g')
    .attr('class', 'brush')
    .call(
      d3.brush()
        .extent([
          [usableArea.left, usableArea.top],
          [usableArea.right, usableArea.bottom]
        ])
        .on('start brush end', brushed)
    );

    // Fix: move brush below dots so it doesn't block hover
    svg.select('.brush').lower();


      
}
   
renderScatterPlot(data, commits);

function renderTooltipContent(commit) {
  if (!commit || Object.keys(commit).length === 0) return;

  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-tooltip-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  link.href = commit.url;
  link.textContent = commit.id;

  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });

  time.textContent = commit.datetime?.toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
  });

  author.textContent = commit.author ?? 'Unknown';
  lines.textContent = commit.totalLines ?? '—';
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

// STEP 5

function createBrushSelector(svg) {
    // Create brush
    svg.call(d3.brush());

    // Raise dots and everything after overlay
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) {
    return false;
  }

  const [[x0, y0], [x1, y1]] = selection;

  // Convert data to screen coordinates
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x0 <= x && x <= x1 && y0 <= y && y <= y1;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

let commitProgress = 100;
let timeScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);
let commitMaxTime = timeScale.invert(commitProgress);
let filteredCommits = commits;

function updateScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));
  yScale.domain([0, 24]);

  const xAxis = d3.axisBottom(xScale);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  // // CHANGE: we should clear out the existing xAxis and then create a new one.
  // svg
  //   .append('g')
  //   .attr('transform', `translate(0, ${usableArea.bottom})`)
  //   .call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function updateFileDisplay(filteredCommits) {
  // after initializing filteredCommits
  let lines = filteredCommits.flatMap((d) => d.lines);
  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  let filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      // This code only runs when the div is initially rendered
      (enter) =>
        enter.append('div').call((div) => {
          div.append('dt').append('code');
          div.append('dd');
        }),
    );

  // This code updates the div info
  filesContainer.select('dt > code').text((d) => d.name);
  filesContainer
  .select('dd')
  .selectAll('div')
  .data((d) => d.lines)
  .join('div')
  .attr('class', 'loc')  // or 'line' if that’s the class you want
  .attr('style', (d) => `--color: ${colors(d.type)}`);

}

function onTimeSliderChange() {
  commitProgress = +d3.select("#commit-progress").property("value");
  commitMaxTime = timeScale.invert(commitProgress);

  d3.select("#commit-slider-time").text(
    commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    })
  );  

  filteredCommits = commits.filter((d) => d.datetime <= commitMaxTime);
  const filteredData = data.filter((d) => d.datetime <= commitMaxTime);

  updateScatterPlot(data, filteredCommits);
  renderCommitInfo(filteredData, filteredCommits); // ✅ Add this
  updateFileDisplay(filteredCommits);
}

d3.select("#commit-progress").on("input", onTimeSliderChange);
onTimeSliderChange();

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
      <p>
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made <a href="${d.url}" target="_blank" rel="noopener noreferrer">${
          i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
        }</a>.
        I edited ${d.totalLines} lines across ${
          d3.rollups(d.lines, D => D.length, d => d.file).length
        } files.
        Then I looked over all I had made, and I saw that it was very good.
      </p>
    `
  )
  

  function onStepEnter(response) {
    const datetime = response.element.__data__.datetime;
  
    commitMaxTime = datetime;
    commitProgress = timeScale(datetime);
  
    d3.select("#commit-progress").property("value", commitProgress);
    d3.select("#commit-slider-time").text(
      datetime.toLocaleString(undefined, {
        dateStyle: "long",
        timeStyle: "short",
      })
    );
  
    filteredCommits = commits.filter((d) => d.datetime <= datetime);
    const filteredData = data.filter((d) => d.datetime <= datetime);
  
    updateScatterPlot(data, filteredCommits);
    renderCommitInfo(filteredData, filteredCommits);
    updateFileDisplay(filteredCommits);
  }
  
const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);