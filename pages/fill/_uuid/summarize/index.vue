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
				:title="criteria.category"
				:subtitle="main_status"
				:is_authenticated="is_authenticated"
				:user="user"
			/>

			<main role="main" id="main" class="summarize">
				<hgroup class="criterion-header">
					<h1>Общие сведения</h1>
					<h2>Начало</h2>
				</hgroup>

				<template v-for="block of criteria.data">
					<div v-if="!block.address" class="criteria-overall">
						<label>Поле "{{ block.name }}" заполнено:</label>
						<div v-if="block.value" style="width: 100%; border-color: var(--colour-agreed)">да</div>
						<div v-else style="width: 100%; border-color: var(--colour-disagreed)">нет</div>
						<p v-if="!block.value">Заполните это поле на первой странице</p>
					</div>

					<div v-else class="criteria-overall">
						<label>Поле "{{ block.name }}" заполнено:</label>

						<template v-if="criteria.configuration?.check_address_spelling && criteria.configuration?.strict_spelling">
							<div v-if="block.value && (block.address.correct ?? true)" style="width: 100%; border-color: var(--colour-agreed)">да</div>
							<div v-else style="width: 100%; border-color: var(--colour-disagreed)">нет</div>
							<p v-if="!block.value || !block.address.correct">Заполните адрес правильно на первой странице</p>
						</template>

						<template v-else>
							<div v-if="block.value" style="width: 100%; border-color: var(--colour-agreed)">да</div>
							<div v-else style="width: 100%; border-color: var(--colour-disagreed)">нет</div>
							<p v-if="!block.value">Заполните адрес на первой странице</p>
						</template>
					</div>
				</template>

				<div v-if="criteria.configuration?.geolocation_allowed" class="criteria-overall">
					<label>Координаты записаны:</label>
					<div v-if="check_coords()" style="width: 100%; border-color: var(--colour-agreed)">да</div>
					<div v-else style="width: 100%; border-color: var(--colour-optional)">нет (необязательно)</div>
					<p v-if="!check_coords()">(необязательно) запишите геолокацию объекта на шаге "Начало и общие сведения"</p>
				</div>

				<div class="criteria-overall" v-if="criteria.configuration?.common_pictures_required ?? 0 != 0">
					<label>{{ criteria.configuration?.common_pictures_required }} общих фото загружено:</label>
					<div v-if="check_picture()" style="width: 100%; border-color: var(--colour-agreed)">100%</div>
					<div v-else :style="`width: ${ total_pictures() }%; border-color: var(--colour-disagreed)`">{{ total_pictures() }}%</div>
					<p v-if="!check_picture()">Загрузите {{ criteria.configuration?.common_pictures_required }} фотографии на первой станице</p>
				</div>

				<div v-if="!check_data() || !check_picture() || !check_coords()">
					<NuxtLink :to="`/fill/${uuid}`" class="link-button">
						<button type="button" class="click-button">перейти к шагу "Начало"</button>
					</NuxtLink>
				</div>

				<template v-for="i in crt_len">
					<hgroup class="criterion-header">
						<h1>{{ criteria.group_keys[i-1] }}</h1>
						<h2>Шаг {{ i }} из {{ crt_len }}</h2>
					</hgroup>

					<div class="criteria-overall">
						<label>Заполнено критериев:</label>
						<div v-if="percents_of(i-1) > 99.99" style="width: 100%; border-color: var(--colour-agreed)">100%</div>
						<div v-else :style="`width: ${percents_of(i-1)}%; border-color: var(--colour-disagreed)`">{{ percents_of(i-1) }}%</div>
						<p v-if="not_filled[i-1] > 0">заполните ещё {{ not_filled[i-1] }} {{ not_filled[i-1] == 1 ? 'критерий' : not_filled[i-1] < 5 ? 'критерия' : 'критериев' }} из {{ total[i-1] }}</p>
					</div>

					<div v-if="not_filled[i-1] > 0">
						<NuxtLink :to="`/fill/${uuid}/step/${i}`" class="link-button">
							<button type="button" class="click-button">перейти к шагу {{ i }}</button>
						</NuxtLink>
					</div>
				</template>

				<hgroup id="criteria-overall" class="criterion-header">
					<h1>Общее состояние</h1>
					<h2>подтверждение</h2>
				</hgroup>

				<div class="criteria-overall">
					<label>Итого заполнено критериев:</label>
					<div v-if="check_filled()" style="width: 100%; border-color: var(--colour-agreed)">100%</div>
					<div v-else :style="`width: ${total_percents()}%; border-color: var(--colour-disagreed)`">{{ total_percents() }}%</div>
					<p v-if="!check_filled()">заполните все критерии, чтобы отправить</p>
				</div>

				<div class="criteria-overall">
					<label>Заполнено общих сведений:</label>
					<div v-if="check_data()" style="width: 100%; border-color: var(--colour-agreed)">100%</div>
					<div v-else :style="`width: ${total_filled_data()}%; border-color: var(--colour-disagreed)`">{{ total_filled_data() }}%</div>
					<p v-if="!check_data()">заполните все поля на шаге "Начало и общие сведения", чтобы отправить</p>
				</div>

				<div v-if="criteria.configuration?.geolocation_allowed" class="criteria-overall">
					<label>Координаты записаны:</label>
					<div v-if="check_coords()" style="width: 100%; border-color: var(--colour-agreed)">да</div>
					<div v-else style="width: 100%; border-color: var(--colour-optional)">нет (необязательно)</div>
					<p v-if="!check_coords()">(необязательно) запишите геолокацию объекта на шаге "Начало и общие сведения"</p>
				</div>

				<div class="criteria-overall" v-if="criteria.configuration?.common_pictures_required ?? 0 != 0">
					<label>{{ criteria.configuration?.common_pictures_required }} общих фото загружено:</label>
					<div v-if="check_picture()" style="width: 100%; border-color: var(--colour-agreed)">100%</div>
					<div v-else :style="`width: ${ total_pictures() }%; border-color: var(--colour-disagreed)`">{{ total_pictures() }}%</div>
					<p v-if="!check_picture()">Загрузите {{ criteria.configuration?.common_pictures_required }} фото на шаге "Начало и общие сведения", чтобы отправить</p>
				</div>

				<div class="criteria-overall">
					<label>Пользователь авторизован:</label>
					<div v-if="check_auth()" style="width: 100%; border-color: var(--colour-agreed)">да</div>
					<div v-else style="width: 100%; border-color: var(--colour-disagreed)">нет</div>
					<p v-if="!check_auth()">авторизуйтесь, чтобы отправить</p>
				</div>

				<div class="criteria-overall">
					<label>Есть подключение:</label>
					<div v-if="check_connection()" style="width: 100%; border-color: var(--colour-agreed)">да</div>
					<div v-else style="width: 100%; border-color: var(--colour-disagreed)">нет</div>
					<p v-if="!check_connection()">подключитесь к интернету, чтобы отправить</p>
				</div>


				<div v-if="check_all()" class="criteria-all_right">
					Вы полностью заполнили чек-лист. Спасибо за Вашу работу.
					Далее можете его отправить на сервер в любое время при наличии
					интернета - снизу появится кнопка "отправить".
				</div>

				<div v-else-if="criteria.status == 'sended'" class="criteria-all_right">
					Вы полностью заполнили и отправили чек-лист.
					Спасибо за Вашу работу. С этим чек-листом больше
					не надо ничего делать.
				</div>

				<div v-else class="criteria-not_all_right">
					Вы пока не заполнили всё, что требуется для отправки. Проверьте,
					чтобы в блоках сверху везде было "да" или "100%" и выполните
					указанное в тексте внизу блоков, где это не так.
				</div>

				<div v-if="check_all() && check_connection()" class="criteria-confirm">
					<div>
						<input type="checkbox" id="confirm" :checked="criteria.status == 'filled' ? 'checked' : null" @change="unlock_send()" />
						<label for="confirm">Подтверждаю, что чек-лист готов к отправке</label>
					</div>
					<br />
					<br />
					<div>
						<button type="button" id="send" class="click-button" :disabled="criteria.status == 'filled' ? null : 'disabled'" @click="send_data()">отправить</button>
					</div>
				</div>
			</main>

			<footer role="navigation" id="footer">
				<NuxtLink :to="`/fill/${uuid}/step/${criteria.group_keys.length}`" class="link-button">
					<button type="button" class="click-button">« назад</button>
				</NuxtLink>

				<div class="select-imit" @click="select_from('steps', go_to_step)" role="select" aria-controls="select-panel">
					<p>Подтверждение и отправка</p>
					<datalist id="steps">
						<option value="begin">Начало и общие сведения</option>
						<option v-for="i in crt_len" :value="i">{{ i }}. {{ criteria.group_keys[i-1] }}</option>
						<option value="end" data-selected="true">Подтверждение и отправка<br /><i>(Вы на этой странице)</i></option>
					</datalist>
				</div>

				<a><button type="button" class="click-button" @click="scroll_to_bottom()">вниз ↓</button></a>
			</footer>

			<dialog id="select-panel" class="hidden" tabindex="-1" role="dialog" aria-hidden="true" aria-modal="false" aria-live="polite" aria-atomic="true" aria-busy="false" aria-labelledby="select-panel-header">
				<div>
					<h1 id="select-panel-header">Выберите вариант</h1>
					<form method="dialog" id="select-panel-options" role="radiogroup" @scroll="scroll_check($event)"></form>
				</div>

				<form method="dialog">
					<button type="button" class="click-button" value="__cancel__" @click="close_select_dialog($event)">отмена</button>
				</form>
			</dialog>
		</template>
	</div>
</template>


<script>
	import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
	import {
		write_file,
		read_file,
		get_user_info,
		select_from,
		close_select_dialog,
		scroll_check,
		get_now,
		check_address,
		check_connection
	} from '~/static/common'

	export default {
		name: 'IndexPage',

		asyncData: async function ({ route }) {
			/// declarations ///

			let uuid = null 	// unique id of checklist form
			let criteria = null // main values of checklist with given uuid

			/// check is all right ///

			try {
				uuid = route.params.uuid

				criteria = await read_file(`criteria/${uuid}/main.txt`)

				await write_file(`criteria/${uuid}/last_step.txt`, 'end')
			} catch {
				return { is_not_valid: true }
			}

			/// input address extra ///

			for (let i = 0; i < criteria.data.length; i++) {
				if (criteria.data[i].address) {
					criteria.data[i].address = check_address(criteria.data[i].value)
				}
			}

			/// extra declarations ///

			let crt_len = criteria.group_keys.length

			/// load groups and calculate statistic ///

			let groups = []

			let agreed = []
			let disagreed = []
			let not_filled = []
			let total = []
			let pictures_loaded = []

			for (let i = 0; i < crt_len; i++) { // for each group
				// load group
				let group = JSON.parse((await Filesystem.readFile({
					path: 'criteria/' + uuid + `/group-${i+1}.txt`,
					directory: Directory.Data,
					encoding: Encoding.UTF8
				}))['data'])

				// declare counters
				let agreed_l = 0
				let disagreed_l = 0
				let not_filled_l = 0
				let pictures_loaded_l = 0

				// count
				for (let criterion of group.criteria) {
					if (criterion.type == 'subcriteria') {
						for(let sub_criterion of criterion.subcriteria) {
							if (sub_criterion.mark == 'да') agreed_l++
							else if (sub_criterion.mark == 'нет') disagreed_l++
							else not_filled_l++

							pictures_loaded_l += sub_criterion.pictures.length
						}
					}

					else if (criterion.type == 'options') {
						if (criterion.option) agreed_l++
						else not_filled_l++

						pictures_loaded_l += criterion.pictures.length
					}

					else if (criterion.type == 'usual') {
						if (criterion.mark == 'да') agreed_l++
						else if (criterion.mark == 'нет') disagreed_l++
						else not_filled_l++

						pictures_loaded_l += criterion.pictures.length
					}
				}

				// push group and statistic to global variables

				groups.push(group)

				agreed.push(agreed_l)
				disagreed.push(disagreed_l)
				not_filled.push(not_filled_l)
				total.push(agreed_l + disagreed_l + not_filled_l)

				pictures_loaded.push(pictures_loaded_l)
			}

			/// visible status ///

			let main_status = ( // display only (header#header > h2)
				criteria.status == 'draft' ?
					'черновик'
					:
					criteria.status == 'filled' ?
						'заполнено'
						:
						'отправлено'
			)

			/// load user ///

			let [is_authenticated, user] = await get_user_info()

			/// return data ///

			return {
				is_not_valid: false,
				is_online: await check_connection(),
				uuid: uuid,

				is_authenticated: is_authenticated,
				user: user,

				criteria: criteria,
				crt_len: crt_len,
				main_status: main_status,
				groups: groups,

				svg_size: 58,
				min_svg_size: 32,

				agreed: agreed,
				disagreed: disagreed,
				not_filled: not_filled,
				total: total,
				pictures_loaded: pictures_loaded
			}
		},

		mounted: function () {
			setInterval(
				async () => { this.is_online = await check_connection() },
				10000
			)
		},

		methods: {
			/**
			 * Relocates user to given form step.
			 *
			 * @param {*} step - step to go to (may be 'begin', 'end' or int started from 1).
			 */
			go_to_step: function (val) {
				if (val) val = val.toString()
				else return

				if (val == 'begin') {
					window.location.pathname = `/fill/${this.uuid}`
				}
				else if (val == 'end') {
					window.location.pathname = `/fill/${this.uuid}/summarize`
				}
				else if (
						val.match(/\d+/) &&
						Number(val) > 0 &&
						Number(val) <= this.crt_len
						) {
					window.location.pathname = `/fill/${this.uuid}/step/${val}`
				}
			},

			select_from: select_from,
			close_select_dialog: close_select_dialog,
			scroll_check: scroll_check,

			/**
			 * Scrolls to the div#criteria-overall at the bottom of the page.
			 */
			scroll_to_bottom: function () {
				let block = document.getElementById('criteria-overall')
				if (block) {
					block.scrollIntoView({behavior: "smooth", block: "center"})
				}
			},

			/**
			 * Returns float from 0 to 100 denoting what percentage of group criteria was met.
			 *
			 * @param {*} group - number of group to calculate.
			 */
			percents_of (group) {
				return Math.round(
					10000 -
					this.not_filled[group] /
					this.total[group] *
					10000
				) / 100
			},

			/**
			 * Returns float from 0 to 100 denoting what percentage of criteria was met.
			 */
			total_percents: function () {
				return Math.round(
					10000 -
					this.not_filled.reduce((a, b) => a + b, 0) /
					this.total.reduce((a, b) => a + b, 0) *
					10000
				) / 100
			},

			total_pictures: function () {
				if (this.criteria.configuration?.common_pictures_required == 0) {
					return 100
				}

				return Math.round(
					this.criteria.pictures.length /
					this.criteria.configuration?.common_pictures_required *
					10000
				) / 100
			},

			/**
			 * Returns float from 0 to 100 denoting what percentage of data fields was met.
			 */
			total_filled_data: function () {
				let filled = 0
				let total = 0

				if (this.criteria.data.length == 0) return 100

				let check_address = this.criteria.configuration?.check_address_spelling && this.criteria.configuration?.strict_spelling

				for (let block of this.criteria.data) {
					if (block.value && (!check_address || (block.address?.correct ?? true))) filled++
					total++
				}

				return Math.round(filled / total * 10000) / 100
			},

			// group of check functions
			check_filled    : function () { return this.total_percents() > 99.99 },
			check_data      : function () { return this.total_filled_data() > 99.99 },
			check_coords    : function () { return !this.criteria.configuration?.geolocation_allowed || this.criteria.coords != null },
			check_picture   : function () { return this.criteria.pictures.length >= this.criteria.configuration?.common_pictures_required ?? 0 },
			check_auth      : function () { return this.is_authenticated },
			check_connection: function () { return this.is_online },

			/**
			 * Returns true, if all checks passed successfully and checklist may be sended.
			 * Returns false otherwise.
			 *
			 * Checks:
			 * - are all criteria filled
			 * - are all data fields filled
			 * - is there at least 1 common picture
			 * - is user authenticated
			 * - is status different from "sended"
			 */
			check_all: function () {
				return (
					this.check_filled() &&
					this.check_data() &&
					// this.check_coords() &&
					this.check_picture() &&
					this.check_auth() &&
					this.criteria.status != 'sended'
				)
			},

			/**
			 * Unlocks send button for user in case it's possible.
			 *
			 * Must pass "check_all" function to be unlocked.
			 */
			unlock_send: async function () {
				if (!this.check_all()) return

				if (document.getElementById('confirm').checked) {
					document.getElementById('send').removeAttribute('disabled')
					this.criteria.status = 'filled'
				}
				else {
					document.getElementById('send').setAttribute('disabled', 'disabled')
					this.criteria.status = 'draft'
				}

				this.update_time()

				await Filesystem.writeFile({
					path: 'criteria/' + this.uuid + `/main.txt`,
					data: JSON.stringify(this.criteria),
					directory: Directory.Data,
					encoding: Encoding.UTF8
				})
			},

			/**
			 * Asks user one more time about send confirmation.
			 *
			 * If agreed, creates load_status file and redirects user to /send/[uuid] page.
			 */
			send_data: async function () {
				if (!confirm('Отправить?')) return

				let pictures_to_send = []

				pictures_to_send.push(...this.criteria.pictures)

				for (let group of this.groups) {
					for (let criterion of group.criteria) {
						if (criterion.type == 'subcriteria') {
							for(let sub_criterion of criterion.subcriteria) {
								pictures_to_send.push(...sub_criterion.pictures)
							}
						}

						else if (criterion.type == 'options') {
							pictures_to_send.push(...criterion.pictures)
						}

						else if (criterion.type == 'usual') {
							pictures_to_send.push(...criterion.pictures)
						}
					}
				}

				try {
					(await Filesystem.readFile({
						path: 'criteria/' + this.uuid + `/load_status.txt`,
						directory: Directory.Data,
						encoding: Encoding.UTF8
					}))['data']
				} catch {
					await Filesystem.writeFile({
						path: 'criteria/' + this.uuid + `/load_status.txt`,
						data: JSON.stringify({
							uuid: this.uuid,
							sended: false,
							pictures_sended: {},
							pictures_to_send: pictures_to_send,
							pictures_count: pictures_to_send.length
						}),
						directory: Directory.Data,
						encoding: Encoding.UTF8
					})
				}

				window.location.href = '/send/' + this.uuid
			},

			/**
			 * Sets checklist "updated" time field to now and saves it.
			 */
			update_time: function () {
				let now = get_now()
				this.criteria.updated = now
				localStorage.setItem(this.uuid, this.criteria.status + ' ' + now)
			},
		}
	}
</script>


<style>
	:root {
		--colour-undefined: #234c72;
		--colour-undefined-front: #FFFFFF;
		--colour-undefined-pale: #e6eeff;
		--colour-undefined-semi-pale: #c6e4ff;
		--colour-undefined-dark-pale: #81c2ff;

		--colour-agreed: #145f06;
		--colour-agreed-front: #FFFFFF;
		--colour-agreed-pale: #ddffd7;
		--colour-agreed-semi-pale: #b1dbab;
		--colour-agreed-dark-pale: #88c280;

		--colour-disagreed: #811d1d;
		--colour-disagreed-front: #FFFFFF;
		--colour-disagreed-pale: #ffc3c3;
		--colour-disagreed-semi-pale: #ffaeae;
		--colour-disagreed-dark-pale: #ff7d7d;

		--colour-optional: #c7a621;
	}


	#not-valid {
		padding: 50px;
	}

	#not-valid > p {
		margin: 100px auto 40px auto;
		font-size: 200%;
		text-align: center;
	}


	#main.summarize {
		width: 100vw;
		min-height: 100vh;
		margin: auto;
	}

	#main.summarize .criterion-header {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		margin: 10px auto;
		text-align: center;
		background: linear-gradient(to right bottom, var(--colour-header-back), #ffdd7e);
		/*background-color: var(--colour-header-back);*/
		color: var(--colour-header-front);
	}
	#main.summarize .criterion-header:not(:first-child) {
		margin-top: 40px;
	}
	#main.summarize .criterion-header h1 {
		font-size: 120%;
		font-weight: bold;
	}
	#main.summarize .criterion-header h2 {
		font-size: 90%;
		font-weight: 100;
		opacity: .85;
	}


	.criteria-overall {
		width: 90%;
		max-width: 500px;
		padding: 10px;
		margin: 20px auto 20px auto;
		border-radius: 20px;
		box-shadow: 0 2px 6px 0 var(--colour-prefront);
	}
	.criteria-overall > label {
		text-align: left;
		font-size: 110%;
	}
	.criteria-overall > div {
		margin: 10px 0;
		border-bottom: 5px solid var(--colour-agreed);
	}
	.criteria-overall > p {
		color: var(--colour-prefront);
		font-size: 80%;
	}


	.criteria-all_right {
		width: 90%;
		padding: 10px;
		margin: 20px auto 20px auto;
		border-radius: 20px;
		box-shadow: 0 2px 6px 0 var(--colour-prefront);
		background-color: #145f06;
		color: #FFFFFF;
	}
	.criteria-not_all_right {
		width: 90%;
		padding: 10px;
		margin: 20px auto 20px auto;
		border-radius: 20px;
		box-shadow: 0 2px 6px 0 var(--colour-prefront);
		background-color: #5f0606;
		color: #FFFFFF;
	}


	.criteria-confirm {
		width: 90%;
		max-width: 600px;
		padding: 10px;
		margin: 20px auto 20px auto;
		border-radius: 20px;
		box-shadow: 0 2px 6px 0 var(--colour-prefront);
	}

	.criteria-confirm div {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: center;
	}

	.criteria-confirm input {
		min-width: 30px;
		min-height: 30px;
		margin: 10px;
	}



	#footer {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: center;
		align-items: center;
		position: sticky;
		bottom: 0;
		left: 0;
		box-sizing: border-box;
		width: 100vw;
		height: 67px;
		padding: 10px;
		border-top: 3px solid var(--colour-btn-back);
		background-color: var(--colour-preback);
		z-index: 6;
	}

	#footer a.link-button {
		margin-left: unset;
		margin-right: unset;
	}

	#footer a:first-child button {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	#footer .select-imit {
		display: flex;
		flex-grow: 1;
		flex-basis: 100px;
		justify-content: center;
		align-items: center;
		width: 100px;
		max-width: 400px;
		height: 44px;
		margin: 0 10px;
		border: 1px solid var(--colour-semiback);
		text-align: center;
	}
	#footer .select-imit > p {
		text-align: center;
		vertical-align: middle;
		font-size: 80%;
	}

	#footer a:last-child button {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}
</style>
