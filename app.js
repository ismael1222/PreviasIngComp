const BASE_URL = '/';
const MATERIAS = {};

// Cargar datos iniciales
fetch('info.json')
    .then(response => response.json())
    .then(data => {
        // Procesar estructura de datos
        Object.values(data).forEach(semestre => {
            Object.entries(semestre).forEach(([materia, info]) => {
                MATERIAS[materia] = info["Materias previas"];
            });
        });
        render();
        window.onhashchange = render;
    })
    .catch(error => console.error('Error cargando datos:', error));

function render() {
    const path = window.location.hash.substr(1);
    const app = document.getElementById('app');
    
    if (path.startsWith('/materia/')) {
        const materia = decodeURIComponent(path.split('/')[2]);
        renderMateria(materia, app);
    } else {
        renderHome(app);
    }
}

function renderHome(container) {
    fetch('info.json')
        .then(response => response.json())
        .then(data => {
            container.innerHTML = `
                <h1>Plan de Estudios</h1>
                <div class="semestre-container">
                    ${Object.entries(data).map(([semestre, materias]) => `
                        <div class="semestre">
                            <h2>Semestre ${semestre}</h2>
                            ${Object.keys(materias).map(materia => `
                                <a href="#/materia/${encodeURIComponent(materia)}" class="materia-link">
                                    ${materia}
                                </a>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        });
}

function renderMateria(materia, container) {
    const previasDirectas = MATERIAS[materia] || [];
    const previasColaterales = new Set();
    
    // Buscar requisitos colaterales
    previasDirectas.forEach(previa => {
        (MATERIAS[previa] || []).forEach(p => {
            if (!previasDirectas.includes(p)) {
                previasColaterales.add(p);
            }
        });
    });

    container.innerHTML = `
        <a href="${BASE_URL}#" class="back-button">← Volver al listado</a>
        <div class="materia-header">
            <h1>${materia}</h1>
        </div>
        <div class="requisitos">
            <div class="requisito-tipo">
                <h3>Requisitos principales (${previasDirectas.length})</h3>
                ${previasDirectas.length ? 
                    previasDirectas.map(p => `
                        <a href="#/materia/${encodeURIComponent(p)}" class="materia-link">
                            📘 ${p}
                        </a>
                    `).join('') : 
                    '<p>No tiene requisitos principales</p>'}
            </div>
            
            <div class="requisito-tipo">
                <h3>Requisitos colaterales (${previasColaterales.size})</h3>
                ${previasColaterales.size ? 
                    [...previasColaterales].map(p => `
                        <a href="#/materia/${encodeURIComponent(p)}" class="materia-link">
                            📖 ${p}
                        </a>
                    `).join('') : 
                    '<p>No tiene requisitos colaterales</p>'}
            </div>
        </div>
    `;
}
