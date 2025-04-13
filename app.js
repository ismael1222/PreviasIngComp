// app.js
const BASE_URL = '/';
const MATERIAS = new Map();
const COOKIE_NAME = 'materias_completadas';

// Funciones de cookies
const getCookieJSON = () => {
    try {
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${COOKIE_NAME}=`));
        return cookie ? JSON.parse(decodeURIComponent(cookie.split('=')[1])) : {};
    } catch {
        return {};
    }
};

const updateCookie = (materia, completada) => {
    const estado = getCookieJSON();
    
    // Limpiar materias inexistentes
    Object.keys(estado).forEach(m => {
        if (!MATERIAS.has(m)) delete estado[m];
    });

    estado[materia] = completada;
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(estado))}; path=${BASE_URL}; max-age=31536000`; // 1 año de duración
};

// Función para crear links de materias
function createMateriaLink(materia, esColateral = false) {
    const sem = MATERIAS.get(materia)?.semestre || '?';
    const estado = getCookieJSON()[materia] ? '✅' : '❌';
    
    const link = document.createElement('a');
    link.className = `materia-link ${getCookieJSON()[materia] ? 'completada' : ''}`;
    link.href = `#/materia/${encodeURIComponent(materia)}`;
    link.innerHTML = `
        <span class="estado-materia">${estado}</span>
        S${sem}: ${materia}
    `;

    link.querySelector('.estado-materia').addEventListener('click', (e) => {
        e.preventDefault();
        const nuevoEstado = !getCookieJSON()[materia];
        updateCookie(materia, nuevoEstado);
        e.target.textContent = nuevoEstado ? '✅' : '❌';
        link.classList.toggle('completada', nuevoEstado);
    });

    return link;
}

// Cargar datos iniciales
fetch(`info.json?nocache=${new Date().getTime()}`)
    .then(response => response.json())
    .then(data => {
        MATERIAS.clear();
        Object.entries(data).forEach(([semestreKey, semestre]) => {
            Object.entries(semestre).forEach(([materia, info]) => {
                MATERIAS.set(materia, {
                    previas: info["Materias previas"],
                    semestre: semestreKey
                });
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
    fetch(`info.json?nocache=${new Date().getTime()}`)
        .then(response => response.json())
        .then(data => {
            container.innerHTML = `
                <h1>Plan de Estudios</h1>
                <div class="semestre-container">
                    ${Object.entries(data).map(([semestreKey, semestre]) => `
                        <div class="semestre">
                            <h2>Semestre ${semestreKey}</h2>
                            ${Object.keys(semestre).map(materia => 
                                createMateriaLink(materia).outerHTML
                            ).join('')}
                        </div>
                    `).join('')}
                </div>
            `;
        });
}

function renderMateria(materia, container) {
    const materiaInfo = MATERIAS.get(materia) || { previas: [], semestre: '?' };
    const previasDirectas = materiaInfo.previas;
    const semestreActual = materiaInfo.semestre;
    const todasPrevias = new Set();
    const visited = new Set();

    const getDependencias = (currentMateria, path = []) => {
        if (visited.has(currentMateria)) return;
        visited.add(currentMateria);

        if (path.includes(currentMateria)) {
            console.warn(`🚨 Ciclo detectado: ${[...path, currentMateria].join(' → ')}`);
            return;
        }

        const dependencias = MATERIAS.get(currentMateria)?.previas || [];
        dependencias.forEach(previa => {
            if (!previasDirectas.includes(previa)) {
                todasPrevias.add(previa);
            }
            getDependencias(previa, [...path, currentMateria]);
        });
    };

    previasDirectas.forEach(previa => {
        if (!MATERIAS.has(previa)) {
            console.warn(`⚠️ Materia no encontrada: ${previa}`);
            return;
        }
        getDependencias(previa, [materia]);
    });

    container.innerHTML = `
        <a href="${BASE_URL}#" class="back-button">← Volver al listado</a>
        <div class="materia-header">
            <h1>S${semestreActual}: ${materia}</h1>
        </div>
        <div class="requisitos">
            <div class="requisito-tipo">
                <h3>Requisitos principales (${previasDirectas.length})</h3>
                ${previasDirectas.length ? 
                    previasDirectas.map(p => createMateriaLink(p).outerHTML).join('') : 
                    '<p>No tiene requisitos principales</p>'}
            </div>
            
            <div class="requisito-tipo">
                <h3>Requisitos colaterales (${todasPrevias.size})</h3>
                ${todasPrevias.size ? 
                    [...todasPrevias].map(p => createMateriaLink(p, true).outerHTML).join('') : 
                    '<p>No tiene requisitos colaterales</p>'}
            </div>
        </div>
    `;
}

// Inicialización
if (window.location.hash) {
    render();
}
