<template>
	<div id="container">
		<AppHeader
			title="Создание нового чек-листа"
			subtitle="выбор категории"
			:is_authenticated="is_authenticated"
			:user="user"
		/>

		<main role="main" id="main" class="new-criterion">
			<form id="criteria-type" @submit="start_fill($event)">
				<div id="choice-block">
					<h1>Выберите категорию</h1>
					<div @scroll="scroll_check($event)" role="radiogroup" aria-required="true">
						<div class="list-note-up hidden" aria-hidden="true">⬆&nbsp;&nbsp;&nbsp;⬆&nbsp;&nbsp;&nbsp;⬆</div>

						<button v-for="key in criteria_keys" type="button" :value="key" @click="switch_category($event)" role="radio" :disabled="READONLY_CRITERIA.indexOf(key) !== -1 ? 'disabled' : null">
							{{ criteria[key].category }}<i>{{ criteria[key].name }}</i>
						</button>

						<div class="list-note-down" aria-hidden="true">⬇&nbsp;&nbsp;&nbsp;⬇&nbsp;&nbsp;&nbsp;⬇</div>
					</div>
				</div>

				<div class="nav-menu" role="menu">
					<NuxtLink to="/" class="link-button" role="menuitem" tabindex="-1">
						<button type="button" class="click-button">меню</button>
					</NuxtLink>
					<button type="submit" class="click-button" role="menuitem" disabled="disabled">далее</button>
				</div>
			</form>
		</main>
	</div>
</template>



<script>
	import json from '/static/criteria.json'
	import {
		readCookie,
		user_dummy,
		get_user_info,
		scroll_check
	} from '~/static/common'
	import { READONLY_CRITERIA, API_URL } from '~/static/config'

	export default {
		name: 'IndexPage',

		data: function () {
			/// load user ///

			let is_authenticated = false
			let user = user_dummy()
			if (readCookie('token')) {
				is_authenticated = true
				user = JSON.parse(readCookie('user'))
			}

			/// return data ///

			return {
				criteria_keys: Object.keys(json),
				criteria: json,

				is_authenticated: is_authenticated,
				user: user,

				READONLY_CRITERIA: READONLY_CRITERIA,

				svg_size: 58 		// size for decorative svgs (also edit static/site.css)
			}
		},

		beforeMount: async function() {
			let [is_authenticated, user] = await get_user_info()
			this.is_authenticated = is_authenticated
			this.user = user
		},

		methods: {
			/**
			 * Unlocks "next" button to pass current step.
			 */
			enable_next: function () {
				document.querySelector('#main form button[type="submit"]').removeAttribute('disabled')
			},

			/**
			 * Changes selected category in radiogroup.
			 *
			 * Should not be called outside of button[role="radio"] click event.
			 *
			 * @param {*} event - button click event.
			 */
			switch_category: function (event) {
				let group = document.querySelector('#choice-block > div')
				for (let button of group.children) {
					button.setAttribute('aria-selected', 'false')
				}
				let block = event.target
				while (block.tagName.toLowerCase() != 'button') block = block.parentElement
				block.setAttribute('aria-selected', 'true')
				this.enable_next()
			},

			/**
			 * Redirects user to next fill page.
			 *
			 * Event needs only to prevent default behavior of form on sumbit.
			 *
			 * @param {*} event - form submit event.
			 */
			start_fill: function (event = null) {
				if (event) {
					event.stopPropagation()
					event.preventDefault()
				}

				let choice_block = document.getElementById('choice-block')
				let button = choice_block.querySelector("button[aria-selected='true']")

				window.location.href = '/new/' + button.value
			},

			scroll_check: scroll_check
		}
	}
</script>



<style>
	#main.new-criterion {
		width: 90%;
		max-width: 600px;
		min-height: (100vh - 83px);
		margin: 20px auto;
	}

	#criteria-type {
		box-sizing: border-box;
		width: 100%;
		padding: 20px 0;
		border-radius: 20px;
		box-shadow: 0 2px 4px 1px var(--colour-prefront);
	}

	#choice-block {
		display: block;
		width: 100%;
		margin: auto;
	}

	#choice-block > h1 {
		display: block;
		padding: 10px 0;
		margin-bottom: 10px;
		background-color: var(--colour-header-back);
		color: var(--colour-header-front);
		font-size: 120%;
		text-align: center;
	}

	#choice-block > div {
		max-height: 60vh;
		overflow: auto;
		position: relative;
	}

	#choice-block > div > button {
		box-sizing: border-box;
		width: 100%;
		height: fit-content;
		padding: 20px 30px;
		border-bottom: 2px solid var(--colour-semiback);
		background-color: var(--colour-preback);
		color: var(--colour-front);
		font-size: 90%;
		text-align: left;
		font-weight: bold;
		transition: .25s;
	}
	#choice-block > div > button[aria-selected="true"] {
		background-color: var(--colour-btn-back);
		color: var(--colour-btn-front);
	}
	#choice-block > div > button[disabled] {
		opacity: .5;
	}

	#choice-block i {
		display: block;
		margin-top: 6px;
		color: var(--colour-prefront);
		font-size: 80%;
		font-weight: normal;
	}
	#choice-block > div > button[aria-selected="true"] > i {
		color: var(--colour-btn-front);
		opacity: .9;
	}

	#main.new-criterion .nav-menu {
		margin: 40px 10px 0 10px;
	}
</style>
