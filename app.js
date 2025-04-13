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
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(estado))}; path=${BASE_URL}; max-age=31536000`;
};

// Modificar la función createMateriaElement
function createMateriaElement(materia, esHeader = false) {
    const sem = MATERIAS.get(materia)?.semestre || '?';
    const estadoInicial = getCookieJSON()[materia] || false;
    
    const elemento = document.createElement(esHeader ? 'div' : 'a');
    const clase = esHeader ? 'materia-header' : 'materia-link';
    
    if (!esHeader) {
        elemento.href = `#/materia/${encodeURIComponent(materia)}`;
    }
    
    elemento.className = `${clase} ${estadoInicial ? 'completada' : ''}`;
    elemento.innerHTML = `
        <span class="estado-materia">${estadoInicial ? '✅' : '❌'}</span>
        <span class="materia-info">
            S${sem}: ${materia}
        </span>
    `;

    elemento.querySelector('.estado-materia').addEventListener('click', (e) => {
        e.preventDefault();
        const nuevoEstado = !getCookieJSON()[materia]; // Leer siempre del estado actual
        updateCookie(materia, nuevoEstado);
        
        // Actualizar visualmente
        e.target.textContent = nuevoEstado ? '✅' : '❌';
        elemento.classList.toggle('completada', nuevoEstado);
        
        // Actualizar todas las instancias
        document.querySelectorAll(`.materia-link:contains("${materia}"), .materia-header-detalle:contains("${materia}")`)
            .forEach(el => {
                el.querySelector('.estado-materia').textContent = nuevoEstado ? '✅' : '❌';
                el.classList.toggle('completada', nuevoEstado);
            });
    });

    return elemento;
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
                                createMateriaElement(materia).outerHTML
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
        <div class="requisitos">
            <div class="requisito-tipo">
                <h3>Requisitos principales (${previasDirectas.length})</h3>
                ${previasDirectas.length ? 
                    previasDirectas.map(p => createMateriaElement(p).outerHTML).join('') : 
                    '<p>No tiene requisitos principales</p>'}
            </div>
            
            <div class="requisito-tipo">
                <h3>Requisitos colaterales (${todasPrevias.size})</h3>
                ${todasPrevias.size ? 
                    [...todasPrevias].map(p => createMateriaElement(p).outerHTML).join('') : 
                    '<p>No tiene requisitos colaterales</p>'}
            </div>
        </div>
    `;

    // Insertar header
    const header = createMateriaElement(materia, true);
    header.classList.add('materia-header-detalle');
    container.insertBefore(header, container.firstChild);
}

if (window.location.hash) {
    render();
}
