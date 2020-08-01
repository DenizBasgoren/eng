import './style'
import { Component, render, h, Fragment, createContext  } from 'preact'
import {useState, useEffect, useContext} from 'preact/hooks'
import { produce } from 'immer'

let context = createContext()

// let urlPrefix = window.location.host.includes('github') ? 'eng' : '.'
let urlPrefix = '..'

window.clearLC = () => {
	for (let i in window.localStorage) {
		delete window.localStorage[i]
	}
}

render(<App />, document.body)


/////////////////////
function parse(s) {
	let res = []
	s.split('\n').filter(o => o).forEach(i => {
		if (i[0] == '/' && i[1] == '/') {
			res.push([])
		} else {
			res[res.length-1].push(i)
		}
	})
	return res
}


//////////////////////
function App () {

	let [s,ss] = useState({
		version: '1',
		lang: 'rus',
		langUpdateNeeded: false,
		allLangs: ['rus', 'tur'],
		engData: [[]],
		data: [[]],
		page: +window.localStorage.page || 0,
		darkMode: !!window.localStorage.darkMode,
		error: ''
	})

	useEffect(() => {
		if (!s.langUpdateNeeded) return

		window.localStorage.lang = s.lang
		fetch(`${urlPrefix}/data/translations/${s.lang}`).then(r => r.text()).then(res => {
			window.localStorage.data = res

			ss( produce(s => {
				s.langUpdateNeeded = false
				s.data = parse(res)
			}))
		})
		.catch(er => {
			ss( produce(s => {
				s.langUpdateNeeded = false
				s.error = 'No Internet'
			}))
		})

	}, [s.langUpdateNeeded])

	useEffect(() => {
		if ( s.version != +window.localStorage.version || !window.localStorage.engData) {
			window.localStorage.version = s.version
			fetch(`${urlPrefix}/data/eng`).then(r => r.text()).then(res => {
				window.localStorage.engData = res
	
				let newLang
				if (window.localStorage.lang) {
					newLang = window.localStorage.lang
				} else {
					newLang = s.lang
					window.localStorage.lang = newLang
				}

				let dataExists = !!window.localStorage.data

				ss( produce(s => {
					s.engData = parse(res)
					if (!dataExists) s.langUpdateNeeded = true
					s.lang = newLang
				}))
			})
			.catch(er => {
				ss( produce(s => {
					s.error = 'No Internet. Restart the app.'
				}))
			})
		}
		else {
			ss( produce(s => {
				s.engData = parse(localStorage.engData)
				s.data = parse(localStorage.data)
				s.lang = localStorage.lang
			}))
		}

	}, [])
	
	// debug
	window._s = s


	return <context.Provider value={[s,ss]}>
		<div class={`App ${s.darkMode ? 'dark' : 'light'}`}>
			{
				s.error ? <Error /> : null
			}
			<Menu />
			{
				s.engData[s.page]?.map((en, en_n) => {
					return <Entry original={en} trans={s.data[s.page][en_n]} />
				})
			}
			{
				s.engData[s.page]?.length > 5 ? <Menu /> : null
			}
			
		</div>
	</context.Provider>
}




////////////////////////
function Menu() {
	let [g,gg] = useContext(context)

	function pageChanged(e) {
		window.localStorage.page = e.target.value
		gg( produce(s => {
			s.page = +e.target.value
		}))
	}

	function darkChanged(e) {
		window.localStorage.darkMode = e.target.value == 'light' ? '' : 'true'
		gg(produce(s => {
			s.darkMode = e.target.value == 'dark'
		}))
	}

	function langChanged(e) {
		gg(produce(s => {
			s.lang = e.target.value
			s.langUpdateNeeded = true
		}))
	}

	return <div class='Menu'>
		<select onChange={pageChanged}>
			{
				Array(g.engData.length).fill(true).map((e,i) => {
					return <option
					value={i.toString()}
					selected={g.page == i ? 'selected' : null}
					>
						{i}
					</option>
				})
			}
		</select>

		<select onChange={darkChanged}>
			<option
				value='dark'
				selected={g.darkMode ? 'selected' : null}
			>
				Dark
			</option>
			<option
				value='light'
				selected={g.darkMode ? null : 'selected'}
			>
				Light
			</option>
		</select>

		<select onChange={langChanged}>
			{
				g.allLangs.map(e => {
					return <option value={e} selected={e == g.lang}>
						{e}
					</option>
				})
			}
		</select>
	</div>
}





/////////////////////////
function Entry({original, trans}) {
	return <div class='Entry'>
		<p>{original}</p>
		<p>{trans}</p>
	</div>
}





//////////////////////////
function Error() {
	let [g,gg] = useContext(context)

	setTimeout(() => {
		gg( produce(s => {
			s.error = ''
		}))
	}, 3000)

	return <div className="Error">
		{g.error}
	</div>
}