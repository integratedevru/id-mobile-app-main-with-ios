<template>
	<div id="container">
		<template v-if="is_not_valid">
			<div id="not-valid">
				<p >К сожалению, возникла ошибка при переходе :(</p>
				<NuxtLink to="/" class="link-button">
					<button type="button" class="click-button">Вернуться на главную</button>
				</NuxtLink>
			</div>
		</template>

		<template v-else>
			<AppHeader
				title="Создание нового чек-листа"
				subtitle="общие сведения"
				:is_authenticated="is_authenticated"
				:user="user"
			/>

			<main role="main" id="main" class="new-criteria-data">
				<div id="criteria-base-info" role="contentinfo">
					<h1>{{ criteria.category }}</h1>
					<h2>{{ criteria.name }}</h2>
				</div>
				<form id="criteria-data" @submit="verify_data($event)" role="form">
					<h1>Заполните общие сведения</h1>

					<div v-if="criteria.configuration?.geolocation_allowed">
						<label>Записать координаты</label>
						<button
							type="button"
							id="coords"
							:class="this.coords != null ? 'coords-written' : null"
							@click="renew_coords()"
							aria-details="Записать координаты по текущей геолокации при наличии разрешения"
						>
						{{ this.coords != null ? 'перезаписать' : 'записать' }}
						</button>
					</div>

					<div>
						<label>Населённый пункт</label>
						<input
							type="text"
							id="city"
							name="city"
							placeholder="Населённый пункт"
							@input="suggest_city(); enable_next($event)"
							@blur="enable_next($event); close_address_suggestions()"
						/>
					</div>

					<template v-if="criteria.data.length != 0">
						<div v-for="block in criteria.data">
							<label>{{ block.name }}</label>
							<input v-if="!block.address"
								type="text"
								:id="'fld-'+block.name"
								class="main-data"
								:placeholder="block.name"
								:title="block.name" :name="block.name"
								data-address="false"
								@input="enable_next($event)"
								@blur="enable_next($event); close_address_suggestions()"
								required aria-required="true"
							/>

							<input v-else
								type="text"
								:id="'fld-'+block.name"
								class="main-data"
								:placeholder="block.name"
								:title="block.name" :name="block.name"
								data-address="true"
								@input="enable_next($event)"
								@blur="enable_next($event); close_address_suggestions()"
								role="combobox"
								aria-autocomplete="list"
								aria-controls="address-variants"
								aria-haspopup="true"
								required aria-required="true"
								:aria-describedby="'field-'+block.name"
							/>

							<p v-if="criteria.configuration?.check_address_spelling && block.address" :id="'field-'+block.name">
								адрес в формате "улица, д. номер"
							</p>
						</div>
					</template>

					<div v-else id="empty-criteria">
						Других общих сведений не предусмотрено в этом критерии.
					</div>

					<div class="nav-menu" role="menu">
						<NuxtLink to="/" class="link-button" role="menuitem">
							<button type="button" class="click-button" tabindex="-1">меню</button>
						</NuxtLink>
						<button type="submit" class="click-button" role="menuitem" :disabled="criteria.data.length == 0 ? null : 'disabled'">далее</button>
					</div>
				</form>

				<aside id="address-variants" class="hidden"></aside>
			</main>
		</template>
	</div>
</template>



<script>
	import { Filesystem, Directory } from '@capacitor/filesystem'
	import { Geolocation } from '@capacitor/geolocation'
	import json from '/static/criteria.json'
	import { debounce } from 'lodash'
	import {
		write_file,
		readCookie,
		user_dummy,
		get_user_info,
		get_now,
		check_address,
		suggest_address,
		suggest_city,
		resolve_geolocation
	} from '~/static/common'

	export default {
		name: 'IndexPage',

		data: function () {
			/// declarations ///

			let criteria = null // main values of checklist with given uuid

			/// check is all right ///

			try {
				criteria = json[this.$route.params.criterion]
			} catch {
				return { is_not_valid: true }
			}

			/// extra declarations ///

			let gradient = `background: linear-gradient(to right, 0%, transparent 0%, transparent 100%);`

			/// load user ///

			let is_authenticated = false
			let user = user_dummy()
			if (readCookie('token')) {
				is_authenticated = true
				user = JSON.parse(readCookie('user'))
			}

			/// back compatability ///

			if (typeof criteria.data[0] == 'string') {
				let new_data = []
				for (let name of criteria.data) new_data.push({
					name: name,
					address: (criteria.configuration?.addresses ?? []).indexOf(name) !== -1
				})
				criteria.data = new_data
			}

			/// return data ///

			return {
				is_not_valid: false,

				is_authenticated: is_authenticated,
				user: user,

				criterion_index: this.$route.params.criterion,

				criteria: criteria,
				crt_len: criteria['groups'].length,

				preferred_address: null,
				coords: null,

				svg_size: 58, 		// size for decorative svgs (also edit static/site.css)
				min_svg_size: 32,	// size for inline svgs (also edit static/site.css)
				gradient: gradient
			}
		},

		beforeMount: async function () {
			let [is_authenticated, user] = await get_user_info()
			this.is_authenticated = is_authenticated
			this.user = user
		},

		methods: {
			/**
			 * Unlocks "next" button to pass current step.
			 */
			enable_next: async function (event) {
				let inputs = document.querySelectorAll('#criteria-data input.main-data')

				let may_pass = true
				for (let input of inputs) {
					if (!input.value) {
						may_pass = false
					}

					if (this.criteria.configuration?.suggest_address_spelling_options) {
						if (input == event.target && input.getAttribute('data-address') == 'true') {
							this.suggest_for(input.value, input, this.preferred_address)
						}
					}

					if (this.criteria.configuration?.check_address_spelling) {
						if (input.getAttribute('data-address') == 'true') {
							let res = check_address(input.value)
							let p = document.getElementById('field-'+input.title)
							p.innerText = res.message
							p.setAttribute('class', res.correct ? 'correct' : 'error')
							if (!res.correct && this.criteria.configuration?.strict_spelling) may_pass = false
						}
					}
				}

				let city_input = document.getElementById('city')
				if (!city_input.value) { may_pass = false }

				let button = document.querySelector('#criteria-data button[type="submit"]')
				if (button) {
					if (may_pass) button.removeAttribute('disabled')
					else button.setAttribute('disabled', 'disabled')
				}
			},

			debounce: debounce,

			suggest_for: debounce(suggest_address, 1000, {leading: true}),

			suggest_city: debounce(() => {
				let input = document.getElementById('city')
				suggest_city(input.value, input)
			}, 1000, {leading: true}),

			close_address_suggestions: async function () {
				await new Promise(r => {setTimeout(r, 100)})
				document.getElementById('address-variants').classList.add('hidden')
			},

			renew_coords: async function () {
				let button = document.getElementById('coords')
				if (button.innerText == 'подождите...') return
				button.innerText = 'подождите...'

				let permission = ((await Geolocation.checkPermissions()).location != 'denied')

				if (!permission) {
					try {
						if ((await Geolocation.requestPermissions()).location == 'denied') {
							button.innerText = 'нет разрешения'
							return
						}
					}
					catch {
						button.innerText = 'нет разрешения'
						return
					}
				}

				let coords = null

				try { coords = await Geolocation.getCurrentPosition({
					enableHighAccuracy: true,
					timeout: 3000
				}) } catch {}

				if (!coords) {
					button.innerText = 'ошибка записи'
					return alert('Разрешите геолокацию для приложения в настройках Вашего телефона.')
				}

				this.coords = {
					timestamp: coords.timestamp,
					latitude: coords.coords.latitude,
					longitude: coords.coords.longitude,
					altitude: coords.coords.altitude,
					accuracy: coords.coords.accuracy
				}

				let text = 'Позиция записана, спасибо.'

				if (this.coords.accuracy > 1000) {
					text += ' Однако точность может быть крайне низкой. \n'
				}
				else if (this.coords.accuracy > 500) {
					text += ' Однако точность может быть очень низкой. \n'
				}
				else if (this.coords.accuracy > 150) {
					text += ' Точность может быть низкой. \n'
				}

				let address = await resolve_geolocation(coords.coords.latitude, coords.coords.longitude)

				if (address) {
					text += '\n'
					text += `Этим координатам соответствует адрес: \n`
					text += `"${address.address}" \n`
					text += '\n'

					this.preferred_address = {
						city: address.city,
						region: address.region,
					}

				}

				if (address && this.criteria.data.filter((x) => { return x.address }).length > 0) {
					text += "Хотите ли Вы автоматически его подставить в адресные поля?"

					if (confirm(text)) {
						for (let block of this.criteria.data) {
							if (block.address) {
								document.getElementById('fld-'+block.name).value = address.address
							}
						}
						document.getElementById('city').value = this.preferred_address.city
						this.enable_next({target: null})
					}

				} else alert(text)

				button.innerText = 'перезаписать'
			},

			/**
			 * Verifies all data fields are not empty.
			 *
			 * Event needs only to prevent default behavior of form on sumbit.
			 *
			 * @param {*} event - form submit event.
			 */
			verify_data: async function (event) {
				if (event) {
					event.stopPropagation()
					event.preventDefault()
				}

				// check inputs and get data

				let inputs = document.querySelectorAll('#criteria-data input.main-data')

				let values = []
				let may_pass = true
				for (let input of inputs) {
					if (!input.value) {
						may_pass = false
						break
					}
					values.push({
						"name": input.name,
						"value": input.value,
						"address": input.getAttribute('data-address') == 'true'
					})
				}

				// check city

				let city = document.getElementById('city')
				if (!city.value) may_pass = false

				// if some data empty, return

				if (!may_pass) return false

				// else go on

				let uuid = crypto.randomUUID()
				let now = get_now()

				let groups = []
				let group_keys = []

				// create correct copy of criteria

				for (let group of this.criteria.groups) {
					let group_criteria = []

					for (let crt of group.criteria) {
						if (typeof crt == 'string') {
							group_criteria.push({
								type: 'usual',

								name: crt,
								mark: null,
								comment: '',
								pictures: []
							})
						}

						else if (crt.hasOwnProperty('subcriteria')) {
							let subcrts = []
							for (let subcrt of crt.subcriteria) {
								subcrts.push({
									name: subcrt,
									mark: null,
									comment: '',
									pictures: []
								})
							}

							group_criteria.push({
								type: 'subcriteria',

								name: crt.name,
								subcriteria: subcrts
							})
						}

						else if (crt.hasOwnProperty('options')) {
							group_criteria.push({
								type: 'options',
								options: crt.options,

								name: crt.name,
								option: null,
								comment: '',
								pictures: []
							})
						}
					}

					groups.push({
						name: group.name,
						note: group.note ?? '',
						criteria: group_criteria
					})
					group_keys.push(group.name)
				}

				// save new checklist

				await Filesystem.mkdir({
					path: 'criteria/' + uuid,
					directory: Directory.Data,
					recursive: true
				})

				await write_file(
					'criteria/' + uuid + '/main.txt',
					JSON.stringify({
						status: 'draft',
						created: now,
						updated: now,

						criteria: this.criterion_index,
						category: this.criteria.category,

						configuration: this.criteria.configuration,

						coords: this.coords,
						preferred_address: this.preferred_address,
						city: city.value,

						indicator: {
							number: this.criteria.index,
							name: this.criteria.name,
						},
						data: values,
						pictures: [],
						group_keys: group_keys
					})
				)

				let i = 1
				for (let group of groups) {
					await write_file(
						'criteria/' + uuid + `/group-${i}.txt`,
						JSON.stringify(group)
					)
					i++
				}

				localStorage.setItem(uuid, 'draft ' + now)

				// redirect user to fill

				window.location.href = '/fill/' + uuid
			},
		}
	}
</script>



<style>
	#main.new-criteria-data {
		width: 90%;
		max-width: 500px;
		margin: 20px auto;
	}

	#criteria-base-info {
		text-align: center;
		margin-bottom: 50px;
	}

	#criteria-base-info h1 {
		font-size: 120%;
		font-weight: bold;
		margin-bottom: 20px;
	}

	#criteria-base-info h2 {
		color: var(--colour-prefront);
	}


	#criteria-data > h1 {
		text-align: center;
		margin: auto;
	}

	#criteria-data {
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border-radius: 20px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
	}

	#criteria-data label {
		display: block;
		width: 100%;
		margin: 0 0 10px 10px;
		font-size: 80%;
		text-align: left;
	}

	#coords {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		background-color: var(--colour-btn-back);
		color: var(--colour-btn-front);
	}
	#coords.coords-written {
		background-color: var(--colour-view-dark);
	}

	#criteria-data p {
		margin: 6px;
		font-size: 70%;
		text-align: left;
		color: #BB0000;
	}
	#criteria-data p.correct {
		color: #13771b;
	}

	#criteria-data > div {
		width: 100%;
		margin-top: 20px;
	}

	#criteria-data input {
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border: 1px solid var(--colour-semifront);
		border-radius: 10px;
		background-color: var(--colour-preback);
	}


	#empty-criteria {
		text-align: center;
		font-size: 80%;
		color: var(--colour-prefront);
	}


	#address-variants {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		border-bottom: 5px solid var(--colour-btn-back);
		z-index: 666;
	}

	#address-variants > div {
		box-sizing: border-box;
		width: 100%;
		padding: 8px 20px;
		border: 1px solid var(--colour-semifront);
		border-bottom: none;
		background-color: var(--colour-preback);
		font-size: 80%;
	}
</style>
