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

			<main role="main" id="main" class="fill-criteria">
				<div id="criteria-base-info" role="contentinfo">
					<h2><b>{{ criteria.indicator?.number }}</b> {{ criteria.indicator?.name }}</h2>
				</div>

				<div v-if="criteria.status != 'draft'" class="warning-block" style="margin: 10px auto; width: 90%;">
					<p>{{ criteria.status == 'filled' ? 'Чек-лист помечен готовым к отправке,' : 'Чек-лист отправлен' }}, редактирование невозможно.</p>
				</div>

				<div id="criteria-data" role="form">
					<div v-if="criteria.configuration?.geolocation_allowed">
						<label>Записать координаты</label>
						<button
							type="button"
							id="coords"
							:class="criteria.coords != null ? 'coords-written' : null"
							@click="renew_coords()"
							aria-details="Записать координаты по текущей геолокации при наличии разрешения"
						>
							{{ criteria.coords != null ? 'перезаписать' : 'записать' }}
						</button>
					</div>

					<div>
						<label>Населённый пункт</label>
						<input
							type="text"
							:value="criteria.city"
							:disabled="criteria.status == 'draft' ? null : 'disabled'"
							placeholder="Населённый пункт"
							name="city"
							id="city"
							@input="suggest_city()"
							@change="change_data($event)"
							@blur="close_address_suggestions()"
						/>
					</div>

					<div v-for="block of criteria.data">
						<label>{{ block['name'] }}</label>
						<input v-if="!block.address"
							type="text"
							:placeholder="block['name']"
							:title="block['name']"
							:value="block['value']"
							:disabled="criteria.status == 'draft' ? null : 'disabled'"
							@change="change_data($event)"
							@blur="close_address_suggestions()"
							aria-required="true"
						/>
						<input v-else
							type="text"
							:placeholder="block['name']"
							:title="block['name']"
							:value="block['value']"
							:disabled="criteria.status == 'draft' ? null : 'disabled'"
							@input="suggest_for($event); check_for_address($event)"
							@change="change_data($event)"
							@blur="close_address_suggestions()"
							role="combobox"
							aria-autocomplete="list"
							aria-controls="address-variants"
							aria-haspopup="true"
							aria-required="true"
							:aria-describedby="'field-'+block.name"
						/>

						<p v-if="criteria.configuration?.check_address_spelling && block['address']" :id="'field-'+block['name']" :class="block['address']['correct'] ? 'correct' : null">
							{{ block['address']['message'] }}
						</p>
					</div>

					<template v-if="criteria.configuration?.common_pictures_allowed != 0">
						<label>общие фото объекта (минимум {{ criteria.configuration?.common_pictures_required ?? 0 }})</label>

						<div v-if="criteria.configuration?.common_pictures_extra_notes" class="crt-pre-photo">
							<p>{{ criteria.configuration?.common_pictures_extra_notes }}</p>
						</div>

						<div class="crt-photo">
								<figure v-for="j in criteria.configuration?.common_pictures_allowed ?? 3" role="button" aria-controls="image-panel">
									<p v-if="!criteria.pictures[j-1]">добавить<br />фото</p>
									<p v-else>посмотреть<br />фото</p>
									<img alt="" :src="pictures[criteria.pictures[j-1]]" :data-iuuid="criteria.pictures[j-1]" @click="open_image($event)" />
									<div @click="process_image_block($event)"></div>
								</figure>
							</div>
						<div class="crt-post-photo">
							<p>Для просмотра / удаления фото нажмите на иконку</p>
						</div>
					</template>
				</div>

				<aside id="address-variants" class="hidden" aria-expanded="false"></aside>
			</main>

			<footer role="navigation" id="footer">
				<NuxtLink to="/" class="link-button">
					<button type="button" class="click-button">« меню</button>
				</NuxtLink>

				<div class="select-imit" @click="select_from('steps', go_to_step)" role="select" aria-controls="select-panel">
					<p>Список групп критериев</p>
					<datalist id="steps">
						<option value="stay" data-selected="true">Начало и общие сведения<br /><i>(Вы на этой странице)</i></option>
						<option v-for="i in crt_len" :value="i">{{ i }}. {{ criteria.group_keys[i-1] }}</option>
						<option value="end">Подтверждение и отправка</option>
					</datalist>
				</div>

				<NuxtLink :to="`/fill/${uuid}/step/1`">
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
						<button type="button" class="img-delete" :disabled="criteria.status == 'draft' ? null : 'disabled'" @click="delete_image()">удалить</button>
						<button type="button" class="img-close" autofocus @click="close_image_dialog()">закрыть</button>
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
	import { Geolocation } from '@capacitor/geolocation'
	import imageCompression from 'browser-image-compression'
	import { debounce } from 'lodash'
	import {
		write_file,
		read_file,
		readCookie,
		createCookie,
		user_dummy,
		get_user_info,
		select_from,
		scroll_check,
		close_select_dialog,
		get_now,
		check_address,
		parse_coordinate,
		suggest_address,
		suggest_city,
		resolve_geolocation
	} from '~/static/common'

	import AppHeader from '~/components/AppHeader.vue';

	export default {
		name: 'IndexPage',

		asyncData: async function ({ route }) {
			/// declarations ///

			let uuid = null 	// unique id of checklist form
			let criteria = null // main values of checklist with given uuid

			/// check is all right ///

			try {
				uuid = route.params.uuid

				criteria = await read_file('criteria/' + uuid + '/main.txt')

				await write_file(`criteria/${uuid}/last_step.txt`, 'begin')
			} catch {
				return { is_not_valid: true }
			}

			/// input address extra ///

			for (let i = 0; i < criteria.data.length; i++) {
				if (criteria.data[i].address) {
					criteria.data[i].address = check_address(criteria.data[i]['value'])
				}
			}

			/// extra declarations ///

			let crt_len = criteria.group_keys.length

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
				main_status: main_status,

				svg_size: 58,
				min_svg_size: 32,

				pictures: {}
			}
		},

		mounted: async function () {
			let pictures = {}

			for (let iuuid of this.criteria.pictures) {
				pictures[iuuid] = await this.load_image(iuuid)
			}

			this.pictures = pictures
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

			/**
			 * Changes data of field and saves it.
			 *
			 * Should not be called outside of input[type="text"] change event.
			 *
			 * @param {*} event - input[type="text"] change event.
			 */
			change_data: async function (event) {
				if (this.criteria.status != 'draft') return

				let name = event.target.placeholder

				if (event.target.name == 'city') {
					this.criteria.city = event.target.value
					await this.update_main()
					return
				}

				for (let i = 0; i < this.criteria.data.length; i++) {
					if (this.criteria.data[i].name == name) {
						this.criteria.data[i].value = event.target.value

						if (this.criteria.configuration?.check_address_spelling) {
							if (this.criteria.data[i].address) {
								let res = check_address(event.target.value)
								let p = document.getElementById('field-'+name)
								p.innerText = res.message
								p.setAttribute('class', res.correct ? 'correct' : 'error')
							}
						}

						break
					}
				}

				await this.update_main()
			},

			check_for_address: function (event) {
				if (this.criteria.status != 'draft') return

				let name = event.target.placeholder
				let value = event.target.value

				for (let i = 0; i < this.criteria.data.length; i++) {
					if (this.criteria.data[i].name == name) {

						if (this.criteria.data[i].address) {
							let res = check_address(value)
							this.criteria.data[i].value = value
							this.criteria.data[i].address = res
						}

						break
					}
				}
			},

			debounce: debounce,

			suggest_for: function (event) {
				if (this.criteria.configuration?.suggest_address_spelling_options) {
					this.suggest_address(
						event.target.value,
						event.target,
						this.criteria.preferred_address
					)
				}
			},

			suggest_address: debounce(suggest_address, 1000, {leading: true}),

			suggest_city: debounce(() => {
				let input = document.getElementById('city')
				suggest_city(input.value, input)
			}, 1000, {leading: true}),

			close_address_suggestions: async function () {
				await new Promise(r => {setTimeout(r, 100)})
				let aside = document.getElementById('address-variants')
				aside.classList.add('hidden')
				aside.setAttribute('aria-hidden', 'true')
				aside.setAttribute('aria-expanded', 'false')
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
						iuuid,
						old_iuuid
					)
				}

				this.pictures = pictures
				p.innerHTML = 'добавить<br />фото'
			},

			/**
			 * Returns image content by specified iuuid (image uuid).
			 *
			 * @param {*} iuuid - string, image uuid to load.
			 */
			load_image: async function (iuuid) {
				try {
					let img = (await Filesystem.readFile({
						path: 'criteria/' + this.uuid + `/img-${iuuid}`,
						directory: Directory.Data
					}))['data']

					let ext = (await Filesystem.readFile({
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

				if (dialog) {
					dialog.ariaBusy = true

					let dialog_img = dialog.querySelector('img')
					dialog_img.src = img.src
					dialog_img.setAttribute('data-iuuid', img.getAttribute('data-iuuid'))

					dialog.classList.remove('hidden')
					dialog.ariaModal = true
					dialog.ariaHidden = true

					let dialog_close = dialog.querySelector('button.img-close')
					dialog_close.focus({preventScroll: false, focusVisible: true})

					dialog.ariaBusy = false
				}

				else if (this.criteria.status == 'draft' && confirm('Убрать изображение?')) {
					old_iuuid = img.getAttribute('data-iuuid')
					await Filesystem.deleteFile({
						path: 'criteria/' + uuid + `/img-${old_iuuid}`,
						directory: Directory.Data
					})

					await this.add_image_param(null, old_iuuid)
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
					let iuuid = img.getAttribute('data-iuuid')

					let block_img = document.querySelector(`#criteria-data img[data-iuuid="${iuuid}"]`)
					block_img.removeAttribute('src')
					block_img.removeAttribute('data-iuuid')
					await this.add_image_param(null, iuuid)
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

			/**
			 * Adds image iuuid to given criterion and saves it.
			 *
			 * Use add_image_param('uuid', 'old-uuid') to replace image.
			 *
			 * Use add_image_param('uuid') to add image.
			 *
			 * Use add_image_param(null, 'old-uuid') to delete old image.
			 *
			 * @param {*} iuuid - string or null, image uuid  to add. If null, ignored.
			 * @param {*} old_iuuid - string or null, image uuid to remove. If null, ignored.
			 */
			add_image_param: async function (iuuid, old_iuuid) {
				if (this.criteria.status != 'draft') return

				let pictures = this.criteria.pictures
				let index = pictures.indexOf(old_iuuid)
				if (index !== -1) pictures.splice(index, 1)
				if (iuuid) pictures.push(iuuid)
				this.criteria.pictures = pictures

				await this.update_main()
			},

			/**
			 * Sets checklist "updated" time field to now and saves it.
			 */
			update_main: async function () {
				let now = get_now()
				this.criteria.updated = now
				localStorage.setItem(this.uuid, this.criteria.status + ' ' + now)

				await write_file(
					`criteria/${this.uuid}/main.txt`,
					JSON.stringify(this.criteria)
				)
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
						for (let i = 0; i < this.criteria.data.length; i++) {
							if (this.criteria.data[i].address) {
								this.criteria.data[i].value = address.address
							}
						}
					}
				} else alert(text)

				button.innerText = 'перезаписать'
			},
		}
	}
</script>



<style>
	:root {
		--colour-warn: #C60000;

		--colour-not_answered-back: #E6EEFF;
		--colour-not_answered-semiback: #C6E4FF;
		--colour-not_answered-decoration: #81C2FF;
		--colour-not_answered-front: #333333;
		--colour-not_answered-title-back: #234C72;
		--colour-not_answered-title-front: #FFFFFF;
	}

	#main.fill-criteria {
		box-sizing: border-box;
		width: 90%;
		max-width: 500px;
		min-height: calc(100vh - 192px);
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

	#criteria-data > div {
		width: 100%;
		margin-bottom: 20px;
	}

	#criteria-data label {
		display: block;
		width: calc(100% - 10px);
		margin: 0 0 10px 10px;
		font-size: 80%;
		text-align: left;
	}

	#criteria-data button {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border-radius: 10px;
		background-color: var(--colour-btn-back);
		color: var(--colour-btn-front);
	}
	#criteria-data button.coords-written {
		background-color: var(--colour-view-dark);
	}

	#criteria-data div p {
		margin: 6px;
		font-size: 70%;
		text-align: left;
		color: #BB0000;
	}
	#criteria-data div p.correct {
		color: #13771b;
	}

	#criteria-data input[type='text'] {
		box-sizing: border-box;
		width: 100%;
		padding: 10px;
		border: 1px solid var(--colour-semifront);
		border-radius: 10px;
		background-color: var(--colour-preback);
	}

	#criteria-data .crt-pre-photo {
		box-sizing: border-box;
		width: 100%;
		padding: 2px 4px;
		margin: 6px 0;
		border: 1px dashed var(--colour-not_answered-decoration);
		background-color: var(--colour-not_answered-back);
		text-align: center;
		position: relative;
	}

	#criteria-data .crt-photo {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 4px;
		margin-bottom: 4px;
		widows: 2;
		columns: 3;
	}
	#criteria-data .crt-photo > figure {
		display: flex;
		flex-grow: 1;
		justify-content: center;
		align-items: center;
		align-content: center;
		width: 60px;
		padding: 10px;
		border: 2px dashed var(--colour-not_answered-decoration);
		background-color: var(--colour-not_answered-back);
		overflow: hidden;
		cursor: pointer;
		position: relative;
	}
	#criteria-data .crt-photo > figure > p {
		font-size: 80%;
		text-align: center;
		color: var(--colour-not_answered-front);
	}
	#criteria-data .crt-photo > figure > img:not([src]) {
		display: none;
	}
	#criteria-data .crt-photo > figure > img[src] {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 4;
	}
	#criteria-data .crt-photo > figure > div {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
		width: 100%;
		height: 100%;
		opacity: 0;
		z-index: 3;
	}

	#criteria-data .crt-post-photo {
		box-sizing: border-box;
		width: 100%;
		padding: 2px 4px;
		border: 1px dashed var(--colour-not_answered-decoration);
		border-radius: 0 0 10px 10px;
		background-color: var(--colour-not_answered-back);
		text-align: center;
		position: relative;
	}
	#criteria-data .crt-post-photo p {
		display: inline;
		color: var(--colour-warn);
		font-size: 60%;
		vertical-align: middle;
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
		z-index: 201;
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
