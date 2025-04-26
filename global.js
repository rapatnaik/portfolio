console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  
  : "/portfolio/";


let pages = [
  { url: 'index.html', title: 'Home' },
  { url: 'projects/index.html', title: 'Projects' },
  // add the rest of your pages here
  { url: 'contact/index.html', title: 'Contact' },
  { url: 'resume/index.html', title: 'Resume' },
  { url: 'https://github.com/rapatnaik', title: 'GitHub' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;
  // Create link and add it to nav
  nav.insertAdjacentHTML('beforeend', `<a href="${url}">${title}</a>`);
}

document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select id='themeselect'>
            <option value="light dark">Automatic</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
      </label>`,
);

const select = document.querySelector('#themeselect');

if ("colorScheme" in localStorage) {
  const saved = localStorage.colorScheme;
  document.documentElement.style.setProperty('color-scheme', saved);
  select.value = saved;
}

select.addEventListener('input', function (event) {
    const colorScheme = event.target.value;
    console.log('color scheme changed to', colorScheme);
    document.documentElement.style.setProperty('color-scheme', colorScheme);
    localStorage.colorScheme = colorScheme;
});


// contact form

const form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
    event.preventDefault();
  
    let params = [];
    const data = new FormData(form);  
    
    for (let [name, value] of data) {
      console.log(name, encodeURIComponent(value));
      params.push(`${name}=${encodeURIComponent(value)}`);
    }

    const url = `${form.action}?${params.join('&')}`;
    console.log(url);

    location.href = url; 
});


export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    console.log(response);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// fetchJSON('../lib/projects.json'); // Update path if needed

// export function renderProjects(project, containerElement) {
//   // Your code will go here
//   containerElement.innerHTML = '';
//   const article = document.createElement('article');
//   article.innerHTML = `
//       <h3>${project.title}</h3>
//       <img src="${project.image}" alt="${project.title}">
//       <p>${project.description}</p>
//   `;
//   containerElement.appendChild(article);
// }

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  console.log("HI WORKS");
  console.log("Project data:", projects);

  containerElement.innerHTML = '';

  if (!projects || projects.length === 0) {
    const placeholder = document.createElement('p');
    placeholder.textContent = 'No projects available at the moment.';
    containerElement.appendChild(placeholder);
    return;
  }

  for (const project of projects) {
    const article = document.createElement('article');

    const heading = document.createElement(headingLevel);
    heading.textContent = project.title;

    const image = document.createElement('img');
    image.src = project.image;
    image.alt = project.title;

    const description = document.createElement('p');
    description.textContent = project.description;

    article.appendChild(heading);
    article.appendChild(image);
    article.appendChild(description);

    containerElement.appendChild(article);
  }
}

export async function fetchGithubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}