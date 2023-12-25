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

			<main role="main" id="main" class="crt-step">
				<div v-if="not_answered_up != 0" class="list-note-up">⬆ пустых критериев: {{ not_answered_up }} ⬆</div>

				<div v-if="criteria.status != 'draft'" class="warning-block" style="margin: 10px auto; width: 90%;">
					<p>{{ criteria.status == 'filled' ? 'Чек-лист помечен готовым к отправке,' : 'Чек-лист отправлен' }}, редактирование невозможно.</p>
				</div>

				<div class="criterion-header">
					<h1>{{ group.name }}</h1>
				</div>

				<div v-if="group.note" class="criterion-note">
					{{ group.note }}
				</div>

				<template v-for="i in grp_len">
					<div :id="'crt-'+i" class="criterion-group" v-if="group.criteria[i-1].type == 'subcriteria'">
						<h1>{{ group.criteria[i-1].name }}</h1>

						<div v-for="i2 in group.criteria[i-1].subcriteria.length" :class="'criterion-block' + (group.criteria[i-1].subcriteria[i2-1].mark == 'да' ? ' block-agreed' : group.criteria[i-1].subcriteria[i2-1].mark == 'нет' ? ' block-disagreed' : '')" :id="'crt-'+i+'-'+i2">
							<div class="crt-header"><h1>{{ group.criteria[i-1].subcriteria[i2-1].name }}</h1></div>
							<div class="crt-choice">
								<button type="button" class="crt-choice-yes" @click="to_yes('crt-'+i+'-'+i2)" :disabled="criteria.status == 'draft' ? null : 'disabled'">да</button>
								<button type="button" class="crt-choice-no" @click="to_no('crt-'+i+'-'+i2)" :disabled="criteria.status == 'draft' ? null : 'disabled'">нет</button>
							</div>
							<div class="crt-photo">
								<figure v-for="j in criteria.configuration?.pictures_per_criterion_allowed ?? 6" role="button" aria-controls="image-panel">
									<p v-if="!group.criteria[i-1].subcriteria[i2-1].pictures[j-1]">добавить<br />фото</p>
									<p v-else>посмотреть<br />фото</p>
									<img alt="" :src="pictures[group.criteria[i-1].subcriteria[i2-1].pictures[j-1]]" :data-iuuid="group.criteria[i-1].subcriteria[i2-1].pictures[j-1]" @click="open_image($event)" />
									<div @click="process_image_block($event)"></div>
								</figure>
							</div>
							<div class="crt-comment">
								<textarea placeholder="комментарий" :value="group.criteria[i-1].subcriteria[i2-1].comment" :readonly="criteria.status == 'draft' ? null : 'readonly'" @change="add_comment('crt-'+i+'-'+i2)"></textarea>
							</div>
						</div>
					</div>

					<div :id="'crt-'+i" :class="'criterion-block' + (group.criteria[i-1].option == null ? '' : ' block-agreed')" v-else-if="group.criteria[i-1].type == 'options'">
						<div class="crt-header"><h1>{{ group.criteria[i-1].name }}</h1></div>
						<div class="crt-choice">
							<div class="select-imit" @click="select_from('crt-'+i+'-dl', to_option, {block:'crt-'+i})" role="select" aria-controls="select-panel">
								<p :id="'crt-'+i+'-dl-title'">{{ group.criteria[i-1].option ? group.criteria[i-1].option : 'Выберите вариант' }}</p>
								<datalist :id="'crt-'+i+'-dl'">
									<option v-for="opt of group.criteria[i-1].options" :value="opt" :data-selected="opt == group.criteria[i-1].option ? 'true' : null">{{ opt }}</option>
									<option value="none">заполнить позже</option>
								</datalist>
							</div>
						</div>
						<div class="crt-photo">
							<figure v-for="j in criteria.configuration?.pictures_per_criterion_allowed ?? 6" role="button" aria-controls="image-panel">
								<p v-if="!group.criteria[i-1].pictures[j-1]">добавить<br />фото</p>
								<p v-else>посмотреть<br />фото</p>
								<img alt="" :src="pictures[group.criteria[i-1].pictures[j-1]]" :data-iuuid="group.criteria[i-1].pictures[j-1]" @click="open_image($event)" />
								<div @click="process_image_block($event)"></div>
							</figure>
						</div>
						<div class="crt-comment">
							<textarea placeholder="комментарий" :value="group.criteria[i-1].comment" :readonly="criteria.status == 'draft' ? null : 'readonly'" @change="add_comment('crt-'+i)"></textarea>
						</div>
					</div>

					<div :id="'crt-'+i" :class="'criterion-block' + (group.criteria[i-1].mark == 'да' ? ' block-agreed' : group.criteria[i-1].mark == 'нет' ? ' block-disagreed' : '')" v-else>
						<div class="crt-header"><h1>{{ group.criteria[i-1].name }}</h1></div>
						<div class="crt-choice">
							<button type="button" class="crt-choice-yes" @click="to_yes('crt-'+i)" :disabled="criteria.status == 'draft' ? null : 'disabled'">да</button>
							<button type="button" class="crt-choice-no" @click="to_no('crt-'+i)" :disabled="criteria.status == 'draft' ? null : 'disabled'">нет</button>
						</div>
						<div class="crt-photo">
							<figure v-for="j in criteria.configuration?.pictures_per_criterion_allowed ?? 6" role="button" aria-controls="image-panel">
								<p v-if="!group.criteria[i-1].pictures[j-1]">добавить<br />фото</p>
								<p v-else>посмотреть<br />фото</p>
								<img alt="" :src="pictures[group.criteria[i-1].pictures[j-1]]" :data-iuuid="group.criteria[i-1].pictures[j-1]" @click="open_image($event)" />
								<div @click="process_image_block($event)"></div>
							</figure>
						</div>
						<div class="crt-comment">
							<textarea placeholder="комментарий" :value="group.criteria[i-1].comment" :readonly="criteria.status == 'draft' ? null : 'readonly'" @change="add_comment('crt-'+i)"></textarea>
						</div>
					</div>
				</template>

				<table id="group-overall" aria-live="polite">
					<thead><tr>
						<th aria-flowto="#overall-answered">
							<span aria-hidden="true">✓</span> заполнено
						</th>
						<th aria-flowto="#overall-unanswered" id="overall-unanswered-title">
							<span aria-hidden="true">×</span> не заполнено
						</th>
					</tr></thead>
					<tbody><tr>
						<td aria-flowto="#overall-answered-percent" id="overall-answered">
							{{ answered }}
						</td>
						<td aria-flowto="#overall-unanswered-percent" id="overall-unanswered">
							{{ not_answered }}
						</td>
					</tr></tbody>
					<tfoot><tr>
						<td aria-flowto="#overall-unanswered-title" id="overall-answered-percent">
							{{ Math.round(answered     / total * 100) }}%
						</td>
						<td id="overall-unanswered-percent">
							{{ Math.round(not_answered / total * 100) }}%
						</td>
					</tr></tfoot>
				</table>

				<div v-if="not_answered_down != 0" class="list-note-down">⬇ пустых критериев: {{ not_answered_down }} ⬇</div>
			</main>

			<footer role="navigation" id="footer">
				<NuxtLink :to="`/fill/${uuid}` + (prev_step == 'begin' ? '' : `/step/${prev_step}`)" class="link-button">
					<button type="button" class="click-button">« назад</button>
				</NuxtLink>

				<div class="select-imit"  :style="gradient" @click="select_from('steps', go_to_step)" role="select" aria-controls="select-panel">
					<p>шаг {{ step }} / {{ crt_len }}</p>
					<datalist id="steps">
						<option value="begin">Начало и общие сведения</option>
						<option v-for="i in step-1" :value="i">{{ i }}. {{ criteria.group_keys[i-1] }}</option>
						<option step :value="step" data-selected="true">{{ step }}. {{ criteria.group_keys[step-1] }}<br /><i>(Вы на этой странице)</i></option>
						<option v-for="i in crt_len-step" :value="step+i">{{ step+i }}. {{ criteria.group_keys[step+i-1] }}</option>
						<option value="end">Подтверждение и отправка</option>
					</datalist>
				</div>

				<NuxtLink :to="`/fill/${uuid}` + (next_step == 'end' ? '/summarize' : `/step/${next_step}`)">
					<button type="button" class="click-button">далее »</button>
				</NuxtLink>
			</footer>

			<dialog id="image-panel" class="hidden" tabindex="-1" role="dialog" aria-hidden="true" aria-modal="false" aria-live="polite" aria-atomic="true" aria-busy="false">
				<div class="dark-back" aria-hidden="true" @click="close_image_dialog()"></div>
				<div class="panel-content">
					<figure>
						<img alt="загруженное изображение" />
					</figure>
					<div>
						<button type="button" class="img-delete" tabindex="1" :disabled="criteria.status == 'draft' ? null : 'disabled'" @click="delete_image()">удалить</button>
						<button type="button" class="img-close" tabindex="2" autofocus @click="close_image_dialog()">закрыть</button>
					</div>
				</div>
			</dialog>

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
	import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
	import imageCompression from 'browser-image-compression'
	import {
		write_file,
		read_file,
		createCookie,
		get_user_info,
		select_from,
		close_select_dialog,
		scroll_check,
		get_now
	} from '~/static/common'

	export default {
		name: 'IndexPage',

		asyncData: async function ({ route }) {
			/// declarations ///

			let uuid = null 	// unique id of checklist form
			let step = null 	// criteria group positional number (numerated from 1)
			let criteria = null // main values of checklist with given uuid
			let group = null	// values of checklist group on given step

			/// check is all right ///

			try {
				uuid = route.params.uuid
				step = Number(route.params.step)

				criteria = await read_file(`criteria/${uuid}/main.txt`)
				group = await read_file(`criteria/${uuid}/group-${step}.txt`)

				await write_file(`criteria/${uuid}/last_step.txt`, step.toString())
			} catch {
				return { is_not_valid: true }
			}

			/// extra declarations ///

			let crt_len = criteria.group_keys.length
			let grp_len = group.criteria.length

			// gradient for footer progress bar (select#step-select)
			let percents = step / criteria.group_keys.length * 100
			let gradient = `background: linear-gradient(to right, var(--colour-semifront) ${percents}%, transparent ${percents}%, transparent 100%);`

			/// short step statistic ///

			let answered = 0   	// passed criteria
			let not_answered = 0  // criteria leaved with no answer
			for (let criterion of group.criteria) {
				if (criterion.type == 'subcriteria') {
					for(let sub_criterion of criterion.subcriteria) {
						if (sub_criterion.mark) answered++
						else not_answered++
					}
				}

				else if (criterion.type == 'options') {
					if (criterion.option) answered++
					else not_answered++
				}

				else if (criterion.type == 'usual') {
					if (criterion.mark) answered++
					else not_answered++
				}
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

			/// load settings ///

			let settings = { edit_photo: false, save_copies: false, picture_source: 'photo' }
			let json = await read_file('user/settings')
			if (json) {
				settings = json
				createCookie('settings', JSON.stringify(json))
			}

			/// load user ///

			let [is_authenticated, user] = await get_user_info()

			/// return data ///

			return {
				is_not_valid: false,
				uuid: uuid,

				is_authenticated: is_authenticated,
				user: user,
				settings: settings,

				criteria: criteria,
				crt_len: crt_len,
				group: group,
				grp_len: grp_len,
				main_status: main_status,

				prev_step: (step <= 1 ? 'begin' : step - 1),
				step: step,
				next_step: (step >= criteria.group_keys.length ? 'end' : step + 1),

				svg_size: 58, 		// size for decorative svgs (also edit static/site.css)
				min_svg_size: 32,	// size for inline svgs (also edit static/site.css)
				gradient: gradient,

				answered: answered,
				not_answered: not_answered,
				total: answered + not_answered,

				not_answered_up: 0,
				not_answered_down: 0,

				pictures: {} // iuuid => image data - filled out in "mounted"
			}
		},

		mounted: async function () {
			window.addEventListener('scroll', this.main_scroll_check)
			this.main_scroll_check()

			let pictures = {}
			for (let criterion of this.group.criteria) {
				if (criterion.type == 'subcriteria') {
					for (let sub_criterion of criterion.subcriteria) {
						for (let iuuid of sub_criterion.pictures) {
							pictures[iuuid] = await this.load_image(iuuid)
						}
					}
				}
				else for (let iuuid of criterion.pictures) {
					pictures[iuuid] = await this.load_image(iuuid)
				}
			}

			this.pictures = pictures
		},

		methods: {
			/**
			 * Relocates user to given form step.
			 *
			 * @param {*} step - step to go to (may be 'begin', 'end' or int started from 1).
			 */
			go_to_step: function (step) {
				if (step) step = step.toString()
				else return

				if (step == 'begin') {
					window.location.pathname = `/fill/${this.uuid}`
				}
				else if (step == 'end') {
					window.location.pathname = `/fill/${this.uuid}/summarize`
				}
				else if (
						step.match(/\d+/) &&
						Number(step) > 0 &&
						Number(step) <= this.crt_len
						) {
					window.location.pathname = `/fill/${this.uuid}/step/${step}`
				}
			},

			/**
			 * Saves some criterion data.
			 *
			 * @param {*} block_id - string, criterion block id (usually, crt-[int] or crt-[int]-[int]).
			 * @param {*} key - string, key to change (usually, 'mark', 'comment', 'option').
			 * @param {*} value - string or null, new value to set.
			 */
			save_param: async function (block_id, key, value) {
				if (this.criteria.status != 'draft') return

				let ids = block_id.split('-')

				if (ids.length == 2) {
					this.group.criteria[Number(ids[1]) - 1][key] = value
				}

				else if (ids.length == 3) {
					this.group.criteria[Number(ids[1]) - 1].subcriteria[Number(ids[2]) - 1][key] = value
				}

				else return

				await this.update_time()

				await Filesystem.writeFile({
					path: 'criteria/' + this.uuid + `/group-${this.step}.txt`,
					data: JSON.stringify(this.group),
					directory: Directory.Data,
					encoding: Encoding.UTF8
				})
			},

			/**
			 * Adds image iuuid to given criterion and saves it.
			 *
			 * Use add_image_param('crt-[int]', 'uuid', 'old-uuid') to replace image.
			 *
			 * Use add_image_param('crt-[int]', 'uuid') to add image.
			 *
			 * Use add_image_param('crt-[int]', null, 'old-uuid') to delete old image.
			 *
			 * @param {*} block_id - string, criterion block id (usually, crt-[int] or crt-[int]-[int]).
			 * @param {*} iuuid - string or null, image uuid  to add. If null, ignored.
			 * @param {*} old_iuuid - string or null, image uuid to remove. If null, ignored.
			 */
			add_image_param: async function (block_id, iuuid, old_iuuid) {
				if (this.criteria.status != 'draft') return

				let ids = block_id.split('-')

				if (ids.length == 2) { // if criterion
					let pictures = this.group.criteria[Number(ids[1]) - 1].pictures
					let index = pictures.indexOf(old_iuuid)
					if (index !== -1) pictures.splice(index, 1)
					if (iuuid) pictures.push(iuuid)
					this.group.criteria[Number(ids[1]) - 1].pictures = pictures
				}

				else if (ids.length == 3) { // if subcriterion
					let pictures = this.group.criteria[Number(ids[1]) - 1].subcriteria[Number(ids[2]) - 1].pictures
					let index = pictures.indexOf(old_iuuid)
					if (index !== -1) pictures.splice(index, 1)
					if (iuuid) pictures.push(iuuid)
					this.group.criteria[Number(ids[1]) - 1].subcriteria[Number(ids[2]) - 1].pictures = pictures
				}

				else return

				await this.update_time()

				await Filesystem.writeFile({
					path: 'criteria/' + this.uuid + `/group-${this.step}.txt`,
					data: JSON.stringify(this.group),
					directory: Directory.Data,
					encoding: Encoding.UTF8
				})
			},

			/**
			 * Switches criterion with specified block id to "да" and saves it.
			 *
			 * @param {*} crt_id - string, criterion block id (usually, crt-[int] or crt-[int]-[int]).
			 */
			to_yes: async function (crt_id) {
				if (this.criteria.status != 'draft') return

				let block = document.getElementById(crt_id)

				if (block.classList.contains('block-agreed')) { // if already "да" - discard it
					this.not_answered += 1
					this.answered -= 1

					block.classList.remove('block-disagreed')
					block.classList.remove('block-agreed')

					await this.save_param(block.id, 'mark', null)
				}
				else {
					if (block.classList.contains('block-disagreed')) {
						this.answered -= 1
					}
					else this.not_answered -= 1
					this.answered += 1

					block.classList.remove('block-disagreed')
					block.classList.add('block-agreed')

					await this.save_param(crt_id, 'mark', 'да')
				}
			},

			/**
			 * Switches criterion with specified block id to "нет" and saves it.
			 *
			 * @param {*} crt_id - string, criterion block id (usually, crt-[int] or crt-[int]-[int]).
			 */
			to_no: async function (crt_id) {
				if (this.criteria.status != 'draft') return

				let block = document.getElementById(crt_id)

				if (block.classList.contains('block-disagreed')) { // if already "нет" - discard it
					this.not_answered += 1
					this.answered -= 1

					block.classList.remove('block-disagreed')
					block.classList.remove('block-agreed')

					await this.save_param(block.id, 'mark', null)
				}
				else {
					if (block.classList.contains('block-agreed')) {
						this.answered -= 1
					}
					else this.not_answered -= 1
					this.answered += 1

					block.classList.remove('block-agreed')
					block.classList.add('block-disagreed')

					await this.save_param(crt_id, 'mark', 'нет')
				}
			},

			/**
			 * Switches criterion with specified block id to selected option and saves it.
			 *
			 * Should not be called outside of select.crt-choice-select change event.
			 *
			 * @param {*} crt_id - string, criterion block id (usually, crt-[int] or crt-[int]-[int]).
			 */
			to_option: async function (value, options) {
				if (this.criteria.status != 'draft') return

				let crt_id = options.block

				let block = document.getElementById(crt_id)

				if (value == 'none') {
					if (block.classList.contains('block-agreed')) {
						block.classList.remove('block-agreed')
						this.answered -= 1
						this.not_answered += 1
					}
				}
				else {
					if (!block.classList.contains('block-agreed')) {
						block.classList.add('block-agreed')
						this.answered += 1
						this.not_answered -= 1
					}
				}
				if (value == 'none') value = null
				await this.save_param(crt_id, 'option', value)
			},

			/**
			 * Saves the comment of criteria with given block id
			 *
			 * Should not be called outside of textarea change event.
			 *
			 * @param {*} crt_id - string, criterion block id (usually, crt-[int] or crt-[int]-[int]).
			 */
			add_comment: async function (crt_id) {
				if (this.criteria.status != 'draft') return

				let block = document.getElementById(crt_id)
				await this.save_param(
					block.id,
					'comment',
					block.querySelector(':scope > .crt-comment > textarea').value
				)
			},

			/**
			 * Returns image content by specified iuuid (image uuid).
			 *
			 * @param {*} iuuid - string, image uuid to load.
			 */
			load_image: async function (iuuid) {
				try {
					let img = (await Filesystem.readFile({ // image base64 data
						path: 'criteria/' + this.uuid + `/img-${iuuid}`,
						directory: Directory.Data
					}))['data']

					let ext = (await Filesystem.readFile({ // image extension
						path: 'criteria/' + this.uuid + `/img-ext-${iuuid}.txt`,
						directory: Directory.Data,
						encoding: Encoding.UTF8
					}))['data']

					return `data:image/${ext};base64,` + img
				} catch { return null }
			},

			/**
			 * Opens clicked image to full screen.
			 *
			 * @param {*} event - image click event.
			 */
			open_image: async function (event) {
				let dialog = document.getElementById('image-panel')
				let img = event.target
				let block = img.parentElement
				while (!block.id.startsWith('crt')) block = block.parentElement

				if (dialog) {
					dialog.ariaBusy = true

					let dialog_img = dialog.querySelector('img')
					dialog_img.src = img.src
					dialog_img.setAttribute('data-iuuid', img.getAttribute('data-iuuid'))
					dialog_img.setAttribute('data-referer', block.id)

					dialog.classList.remove('hidden')
					dialog.ariaModal = true
					dialog.ariaHidden = true

					let dialog_close = dialog.querySelector('button.img-close')
					dialog_close.focus({preventScroll: false, focusVisible: true})

					dialog.ariaBusy = false
				}

				else if (this.criteria.status != 'draft' && confirm('Убрать изображение?')) { // redo
					old_iuuid = img.getAttribute('data-iuuid')
					await Filesystem.deleteFile({
						path: 'criteria/' + uuid + `/img-${old_iuuid}`,
						directory: Directory.Data
					})

					await this.add_image_param(block.id, null, old_iuuid)
					delete this.pictures[old_iuuid]

					img.src = ''
					img.removeAttribute('data-iuuid')
				}
			},

			/**
			 * Deletes image currently opened in full screen.
			 */
			delete_image: async function () {
				if (this.criteria.status != 'draft') return

				let img = document.querySelector('#image-panel img')
				if (img) {
					let ref = img.getAttribute('data-referer')
					let iuuid = img.getAttribute('data-iuuid')

					let block_img = document.querySelector(`#${ref} img[data-iuuid="${iuuid}"]`)
					block_img.removeAttribute('src')
					block_img.removeAttribute('data-iuuid')
					await this.add_image_param(ref, null, iuuid)
					delete this.pictures[iuuid]
				}
				this.close_image_dialog()
			},

			/**
			 * Closes image opened to full screen.
			 */
			close_image_dialog: function () {
				let dialog = document.getElementById('image-panel')
				if (dialog) {
					dialog.classList.add('hidden')
					dialog.ariaModal = false
					dialog.ariaHidden = true
				}
			},

			select_from: select_from,
			close_select_dialog: close_select_dialog,
			scroll_check: scroll_check,

			main_scroll_check: function () {
				let criteria = document.getElementsByClassName('criterion-block')

				let up = 0
				let down = 0
				for (let criterion of criteria) {
					if (
						criterion.classList.contains('block-agreed') ||
						criterion.classList.contains('block-disagreed')
						) continue

					let offset = 0
					if (criterion.parentElement.classList.contains('criterion-group')) {
						offset = criterion.parentElement.offsetTop
					}

					if (offset + criterion.offsetTop + 83 < window.scrollY) {
						up++
					}
					else if (offset + criterion.offsetTop - window.innerHeight + 67 > window.scrollY) {
						down++
					}
				}

				this.not_answered_up = up
				this.not_answered_down = down
			},

			/**
			 * Adds image from input[type="file"].
			 *
			 * Must not be called outside of input[type="file"] change event.
			 *
			 * @param {*} event - input[type="file"] change event.
			 */
			process_image_block: async function (event) {
				event.preventDefault()
				if (this.criteria.status != 'draft') return

				let block = event.target
				while (block.tagName.toLowerCase() != 'figure') block = block.parentElement
				let group = block.parentElement
				let input = block.querySelector('input')
				let img = block.querySelector('img')
				let p = block.querySelector('p')

				let uuid = this.uuid
				let add_image_param = this.add_image_param
				let pictures = this.pictures

				// delete old

				let old_iuuid = null
				if (img.src) {
					old_iuuid = img.getAttribute('data-iuuid')
					await Filesystem.deleteFile({
						path: 'criteria/' + uuid + `/img-${old_iuuid}`,
						directory: Directory.Data
					})
				}

				// load new

				if (true) {
					let cam_src = (
						this.settings.picture_source == 'photo' ?
						CameraSource.Camera :
						this.settings.picture_source == 'storage' ?
						CameraSource.Photos :
						this.settings.picture_source == 'ask' ?
						CameraSource.Prompt :
						CameraSource.Camera // default
					)

					let res = await Camera.getPhoto({
						quality: 90,
						allowEditing: this.settings.edit_photo, // if true, user may edit taken photo in external editor before load
						saveToGallery: this.settings.save_copies, // if true, saves the dublicate
						webUseInput: true, // prefer classic file input for web
						correctOrientation: false, // if true, rotates any image to portrait mode
						promptLabelHeader: 'Загрузить фото',
						promptLabelCancel: 'Отмена',
						promptLabelPhoto: 'Из хранилища',
						promptLabelPicture: 'Сделать фото',
						resultType: CameraResultType.Base64,
						source: cam_src
					})

					p.innerHTML = 'загрузка<br />0%'

					let iuuid = crypto.randomUUID()
					let ext = res.format
					let file_content = res.base64String
					let src = 'data:image/'+ext+';base64,'+ file_content

					// let datetime = res.exif?.DateTime ?? get_now() /////////////////

					// res.exif.DateTime = 'yyyy:mm:dd hh:mm:ss'

					function rnd () { return Math.round(Math.random()*10) }

					p.innerHTML = `загрузка<br />${10 + rnd()}%`

					// compress image
					src = await imageCompression.getFilefromDataUrl(src, iuuid)
					p.innerHTML = `загрузка<br />${20 + rnd()}%`
					src = await imageCompression(src, { maxSizeMB: .2 }) //maxWidthOrHeight: 500
					p.innerHTML = `загрузка<br />${60 + rnd()}%`
					src = await imageCompression.getDataUrlFromFile(src)
					p.innerHTML = `загрузка<br />${70 + rnd()}%`

					// load to UI

					img.setAttribute('data-iuuid', iuuid)
					img.setAttribute('src', src)

					p.innerHTML = `загрузка<br />${80 + rnd()}%`

					// save to file system

					await Filesystem.writeFile({
						path: 'criteria/' + uuid + `/img-ext-${iuuid}.txt`,
						data: ext,
						directory: Directory.Data,
						encoding: Encoding.UTF8
					})

					await Filesystem.writeFile({
						path: 'criteria/' + uuid + `/img-${iuuid}`,
						data: src.replace(/^data:image\/\w+;base64,/i, ''),
						directory: Directory.Data
					})

					p.innerHTML = `загрузка<br />${90 + rnd()}%`

					// save record

					if (old_iuuid) delete pictures[old_iuuid]
					pictures[iuuid] = src

					await add_image_param(
						group.parentElement.id,
						iuuid,
						old_iuuid
					)
				}

				this.pictures = pictures
				p.innerHTML = 'добавить<br />фото'
			},

			/**
			 * Sets checklist "updated" time field to now and saves it.
			 */
			update_time: async function () {
				let now = get_now()
				this.criteria.updated = now
				localStorage.setItem(this.uuid, this.criteria.status + ' ' + now)

				await write_file(
					`criteria/${this.uuid}/main.txt`,
					JSON.stringify(this.criteria)
				)
			},
		}
	}
</script>


<style>
	:root {
		--colour-not_answered-back: #E6EEFF;
		--colour-not_answered-semiback: #C6E4FF;
		--colour-not_answered-decoration: #81C2FF;
		--colour-not_answered-front: #333333;
		--colour-not_answered-title-back: #234C72;
		--colour-not_answered-title-front: #FFFFFF;

		--colour-answered-back: #2f4b72;
		--colour-answered-semiback: #355a8e;
		--colour-answered-decoration: #81C2FF;
		--colour-answered-front: #DDDDDD;
		--colour-answered-title-back: #163450;
		--colour-answered-title-front: #FFFFFF;
	}


	#not-valid {
		padding: 50px;
	}

	#not-valid > p {
		margin: 100px auto 40px auto;
		font-size: 200%;
		text-align: center;
	}


	#main.crt-step {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: space-around;
		gap: 20px;
		width: 100vw;
		min-height: 100vh;
		margin: auto;
	}

	#main.crt-step .criterion-header {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		margin: 10px auto;
		background: linear-gradient(to right bottom, var(--colour-header-back), #ffdd7e);
		/* background-color: var(--colour-header-back); */
		color: var(--colour-header-front);
		text-align: center;
		font-size: 120%;
		font-weight: bold;
	}

	.criterion-note {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 10px 30px;
		margin: 10px auto;
		background-color: var(--colour-preback);
		color: var(--colour-front);
		font-size: 80%;
	}

	#main .criterion-group {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		align-items: baseline;
		gap: 20px;
		width: calc(90% + 14px);
		padding-left: 4px;
		margin: 20px auto 50px auto;
		border-left: 10px solid var(--colour-btn-back);
		border-bottom: 6px solid var(--colour-btn-back);
		background-color: var(--colour-semiback);
		border-radius: 0 20px 20px 20px;
		position: relative;
	}
	#main .criterion-group > h1 {
		position: sticky;
		top: 83px;
		transform: translateX(-7px);
		display: block;
		box-sizing: border-box;
		width: calc(100% + 7px);
		padding: 10px;
		margin: 0;
		border-radius: 0 0 20px 0;
		background-color: var(--colour-btn-back);
		color: var(--colour-btn-front);
		z-index: 5;
	}

	#main .criterion-group > .criterion-block:first-of-type {
		margin-top: 10px;
	}
	#main .criterion-group > .criterion-block:last-of-type {
		margin-bottom: 10px;
	}

	#main .criterion-block {
		width: 90%;
		max-width: 500px;
		height: fit-content;
		padding: 10px;
		margin: 20px auto 50px auto;
		border-radius: 0 0 20px 20px;
		background-color: var(--colour-not_answered-back);
		box-shadow: 0 2px 6px 1px var(--colour-prefront);
	}

	#main .criterion-block > * {
		box-sizing: border-box;
		width: 100%;
		margin-top: 10px;
	}

	#main .criterion-block > .crt-header {
		margin-top: 0;
		padding: 10px;
		background-color: var(--colour-not_answered-title-back);
		color: var(--colour-not_answered-title-front);
		font-weight: bold;
		text-align: center;
	}

	#main .criterion-block textarea {
		box-sizing: border-box;
		width: 100%;
		height: 140px;
		min-height: 100px;
		margin-bottom: -5px;
		padding: 4px;
		border: 1px solid var(--colour-not_answered-decoration);
		border-radius: 0 0 10px 10px;
		background-color: var(--colour-not_answered-semiback);
		color: var(--colour-not_answered-front);
		font-size: 90%;
		resize: vertical;
		position: relative;
	}
	#main .criterion-block textarea::placeholder {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--colour-not_answered-front);
	}

	#main .criterion-block > .crt-photo {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 4px;
		widows: 2;
		columns: 3;
	}
	#main .criterion-block > .crt-photo > figure {
		display: flex;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		align-content: center;
		width: 60px;
		padding: 10px;
		border: 2px dashed var(--colour-not_answered-decoration);
		background-color: var(--colour-not_answered-semiback);
		overflow: hidden;
		cursor: pointer;
		position: relative;
	}
	#main .criterion-block > .crt-photo > figure > p {
		font-size: 80%;
		text-align: center;
		color: var(--colour-not_answered-front);
	}
	#main .criterion-block > .crt-photo > figure > img:not([src]) {
		display: none;
	}
	#main .criterion-block > .crt-photo > figure > img[src] {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 4;
	}
	#main .criterion-block > .crt-photo > figure > div {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
		width: 100%;
		height: 100%;
		opacity: 0;
		z-index: 3;
	}

	#main .criterion-block > .crt-choice {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: space-between;
		gap: 4px;
		height: fit-content;
	}

	#main .criterion-block .crt-choice-yes {
		display: flex;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		align-content: center;
		width: 100px;
		padding: 14px 0;
		border: 1px solid var(--colour-not_answered-decoration);
		background-color: var(--colour-not_answered-semiback);
		color: var(--colour-not_answered-front);
		font-size: 130%;
		text-align: center;
	}
	#main .criterion-block .crt-choice-yes:active {
		background-color: var(--colour-not_answered-decoration);
	}

	#main .criterion-block .crt-choice-no {
		display: flex;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		align-content: center;
		width: 100px;
		padding: 14px 0;
		border: 1px solid var(--colour-not_answered-decoration);
		background-color: var(--colour-not_answered-semiback);
		color: var(--colour-not_answered-front);
		font-size: 130%;
		text-align: center;
	}
	#main .criterion-block .crt-choice-no:active {
		background-color: var(--colour-not_answered-decoration);
	}

	#main .criterion-block .select-imit {
		box-sizing: border-box;
		width: 100%;
		height: fit-content;
		padding: 14px 0;
		background-color: var(--colour-not_answered-semiback);
		border: 1px solid var(--colour-not_answered-decoration);
		text-align: center;
	}


	#main .criterion-block:is(.block-agreed, .block-disagreed) {
		background-color: var(--colour-answered-back);
	}
	#main .criterion-block:is(.block-agreed, .block-disagreed) > .crt-header {
		background-color: var(--colour-answered-title-back);
		color: var(--colour-answered-title-front);
	}
	#main .criterion-block:is(.block-agreed, .block-disagreed) textarea {
		border-color: var(--colour-answered-decoration);
		background-color: var(--colour-answered-semiback);
		color: var(--colour-answered-front);
	}
	#main .criterion-block:is(.block-agreed, .block-disagreed) textarea::placeholder {
		color: var(--colour-answered-front);
	}
	#main .criterion-block:is(.block-agreed, .block-disagreed) > .crt-photo > figure {
		border-color: var(--colour-answered-decoration);
		background-color: var(--colour-answered-semiback);
	}
	#main .criterion-block:is(.block-agreed, .block-disagreed) > .crt-photo > figure p {
		color: var(--colour-answered-front);
	}
	#main .criterion-block:is(.block-agreed, .block-disagreed) .select-imit {
		border-color: var(--colour-answered-decoration);
		background-color: var(--colour-answered-title-back);
		color: var(--colour-answered-title-front);
	}

	#main .criterion-block.block-agreed .crt-choice-yes {
		background-color: var(--colour-answered-title-back);
		color: var(--colour-answered-title-front);
	}
	#main .criterion-block.block-agreed .crt-choice-yes::before {
		content: "✔";
	}
	#main .criterion-block.block-agreed .crt-choice-no {
		opacity: .25;
	}

	#main .criterion-block.block-disagreed .crt-choice-no {
		background-color: var(--colour-answered-title-back);
		color: var(--colour-answered-title-front);
	}
	#main .criterion-block.block-disagreed .crt-choice-no::before {
		content: "✔";
	}
	#main .criterion-block.block-disagreed .crt-choice-yes {
		opacity: .25;
	}


	#group-overall {
		width: calc(90% + 20px);
		margin: 20px auto 20px auto;
		border-radius: 20px;
		box-shadow: 0 2px 6px 0 var(--colour-prefront);
	}

	#group-overall :is(td, th) {
		padding: 10px;
		text-align: center;
	}

	#group-overall > thead th:nth-child(1) {
		border-top-left-radius: 20px;
		width: 50%;
		background-color: var(--colour-good-back);
		color: var(--colour-good-front);
	}
	#group-overall > thead th:nth-child(2) {
		border-top-right-radius: 20px;
		width: 50%;
		background-color: var(--colour-bad-back);
		color: var(--colour-bad-front);
	}

	#group-overall > tbody td:nth-child(1) {
		background-color: var(--colour-good-alt-back);
		color: var(--colour-good-alt-front);
	}
	#group-overall > tbody td:nth-child(2) {
		background-color: var(--colour-bad-alt-back);
		color: var(--colour-bad-alt-front);
	}


	#group-overall > tfoot td:nth-child(1) {
		border-bottom-left-radius: 20px;
		width: 50%;
		background-color: var(--colour-good-back);
		color: var(--colour-good-front);
	}
	#group-overall > tfoot td:nth-child(2) {
		border-bottom-right-radius: 20px;
		width: 50%;
		background-color: var(--colour-bad-back);
		color: var(--colour-bad-front);
	}


	@media screen and (min-width: 600px) {
		#group-overall {
			min-width: calc(100vw + 50px);
			transform: translateX(-25px);
		}
	}


	#main.crt-step .list-note-up {
		top: 81px;
		opacity: 1;
		z-index: 6;
	}

	#main.crt-step .list-note-up ~ .criterion-group > h1 {
		top: 108px;
	}

	#main.crt-step .list-note-down {
		bottom: 67px;
		opacity: 1;
		z-index: 6;
	}


	#image-panel {
		display: flex;
		justify-content: center;
		align-items: center;
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		box-sizing: border-box;
		background-color: transparent;
		z-index: 200;
	}

	.panel-content {
		display: block;
		position: relative;
		width: 90%;
		z-index: 202;
	}

	#image-panel .panel-content img {
		width: 100%;
		max-height: calc(100vh - 100px);
	}

	#image-panel .panel-content > div {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		gap: 20px;
		margin-top: 10px;
	}
	#image-panel .panel-content > div > button {
		height: 44px;
		padding: 4px 10px;
		border-radius: 20px;
		text-align: center;
		vertical-align: middle;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
	}
	#image-panel .panel-content .img-delete {
		background-color: #811d1d;
		color: #FFFFFF;
	}
	#image-panel .panel-content .img-delete[disabled] {
		background-color: #ac7878;
		color: #cccccc;
	}
	#image-panel .panel-content .img-close {
		display: flex;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		background-color: var(--colour-semiback);
		color: var(--colour-front);
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
