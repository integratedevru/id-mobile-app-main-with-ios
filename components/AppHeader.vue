<template>
	<header role="banner" id="header">
		<hgroup>
			<h1>{{ title }}</h1>
			<h2>({{ subtitle }})</h2>
		</hgroup>

		<div @click="open_navigation()" role="button" aria-label="Открыть боковую панель" aria-controls="navigation-panel" aria-haspopup="menu">
			<div v-if="is_authenticated" class="big-user-logo" aria-hidden="true">
				<p class="user-pseudo-logo" translate="no">{{ user.role_short }}</p>
			</div>
			<button v-else type="button" id="account-button" title="открыть информацию о пользователе" aria-hidden="true">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" :width="svg_size" :height="svg_size" fill="var(--colour-front)"><path d="M480-481q-66 0-108-42t-42-108q0-66 42-108t108-42q66 0 108 42t42 108q0 66-42 108t-108 42ZM160-160v-94q0-38 19-65t49-41q67-30 128.5-45T480-420q62 0 123 15.5t127.921 44.694q31.301 14.126 50.19 40.966Q800-292 800-254v94H160Zm60-60h520v-34q0-16-9.5-30.5T707-306q-64-31-117-42.5T480-360q-57 0-111 11.5T252-306q-14 7-23 21.5t-9 30.5v34Zm260-321q39 0 64.5-25.5T570-631q0-39-25.5-64.5T480-721q-39 0-64.5 25.5T390-631q0 39 25.5 64.5T480-541Zm0-90Zm0 411Z"/></svg>
			</button>
		</div>

		<aside id="navigation-panel" class="shifted" hidden="true" role="complementary" aria-live="polite" aria-hidden="true" tabindex="-1">
			<div class="dark-back hidden" aria-hidden="true" @click="close_navigation()"></div>
			<nav id="navigation-content" role="navigation">
				<div id="nav-top">
					<NuxtLink v-if="is_authenticated" to='/account' class="link-button user-block">
						<div class="user-logo" aria-hidden="true">
							<p class="user-pseudo-logo" translate="no">{{ user.role_short }}</p>
						</div>
						<div class="user-info">
							<label class="user-first">{{ user.first }}</label>
							<label class="user-role">{{ user.role }}</label>
						</div>
					</NuxtLink>

					<NuxtLink v-else to='/account' class="link-button user-block">
						<button type="button" class="click-button">войти</button>
					</NuxtLink>
				</div>

				<div id="nav-main">
					<div id="block-view">
						<NuxtLink v-if="draft" to="/view/draft" class="view-draft">
							<h1>все черновики</h1>
							<p>сейчас {{ draft }}</p>
						</NuxtLink>
						<a v-else class="view-deactivated">
							<h1>все черновики</h1>
							<p>сейчас {{ filled }}</p>
						</a>

						<NuxtLink v-if="filled" to="/view/filled" class="view-filled">
							<h1>все заполненные</h1>
							<p>сейчас {{ filled }}</p>
						</NuxtLink>
						<a v-else class="view-deactivated">
							<h1>все заполненные</h1>
							<p>сейчас {{ filled }}</p>
						</a>

						<NuxtLink v-if="sended" to="/view/sended" class="view-sended">
							<h1>все отправленные</h1>
							<p>сейчас {{ sended }}</p>
						</NuxtLink>
						<a v-else class="view-deactivated">
							<h1>все отправленные</h1>
							<p>сейчас {{ sended }}</p>
						</a>
					</div>

					<div id="block-create">
						<NuxtLink to="/new" class="link-button">
							<button type="button" class="click-button">создать новый чек-лист</button>
						</NuxtLink>
					</div>
				</div>

				<footer class="nav-menu" role="menu">
					<button type="button" class="click-button" @click="close_navigation()">закрыть</button>
					<NuxtLink to="/" class="link-button">
						<button type="button" class="click-button">меню</button>
					</NuxtLink>
				</footer>
			</nav>
		</aside>
	</header>
</template>

<script>
	export default {
		name: 'AppHeader',

		props: ['title', 'subtitle', 'is_authenticated', 'user'],

		data: function () {
			/// navigation panel statistic ///

			let draft = 0
			let filled = 0
			let sended = 0

			for (let i = 0; i < localStorage.length; i++) {
				let val = localStorage.getItem(localStorage.key(i))
				if      (val.startsWith('draft' )) draft++
				else if (val.startsWith('filled')) filled++
				else if (val.startsWith('sended')) sended++
			}

			return {
				draft: draft,
				filled: filled,
				sended: sended
			}
		},

		methods: {
			/**
			 * Opens right navigation panel.
			 */
			open_navigation: function () {
				let aside = document.getElementById('navigation-panel')
				if (aside) {
					aside.classList.remove('shifted')
					aside.hidden = false
					aside.ariaHidden = false
					aside.querySelector(':scope > .dark-back').classList.remove('hidden')
				}
			},

			/**
			 * Closes right navigation panel.
			 */
			close_navigation: function () {
				let aside = document.getElementById('navigation-panel')
				if (aside) {
					aside.classList.add('shifted')
					aside.hidden = true
					aside.ariaHidden = true
					aside.querySelector(':scope > .dark-back').classList.add('hidden')
				}
			},
		}
	}
</script>

<style>
	#header {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		position: sticky;
		top: 0;
		box-sizing: border-box;
		width: 100vw;
		height: 83px;
		padding: 10px;
		border-bottom: 3px solid var(--colour-btn-back);
		background-color: var(--colour-preback);
		z-index: 10;
	}

	#header > hgroup {
		display: flex;
		flex-grow: 1;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: center;
		align-items: center;
		height: 60px;
		text-align: center;
		overflow: hidden;
	}
	#header > hgroup h2 {
		font-size: 90%;
		color: var(--colour-semifront);
	}

	#header > div:last-child {
		width: 60px;
		height: 60px;
	}


	#block-view > a {
		display: block;
		box-sizing: border-box;
		width: 100%;
		padding: 0 30px;
		margin: 20px 0;
		background: transparent;
		color: #000000;
		text-align: center;
		text-decoration: none;
	}

	#block-view > a > h1 {
		margin-bottom: 10px;
		text-align: center;
		font-size: 100%;
		font-weight: bold;
		text-decoration: underline;
		color: var(--colour-view-dark);
	}
	#block-view > a > p {
		text-align: center;
		font-size: 90%;
		opacity: .8;
	}

	#block-view > hr {
		width: 60%;
		height: 3px;
		margin: auto;
		background-color: var(--colour-view);
	}

	#nav-main #block-view a {
		background-color: var(--colour-preback);
		border-radius: 20px;
		padding-top: 6px;
		padding-bottom: 6px;
	}

	#navigation-panel {
		position: fixed;
		top: 0;
		right: 0;
		width: 80vw;
		max-width: 500px;
		height: 100vh;
		background-color: var(--colour-back);
		transition: .25s;
		z-index: 100;
	}

	.shifted {
		transform: translateX(100%);
	}

	#navigation-content {
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: center;
		position: absolute;
		top: 0;
		right: 0;
		box-sizing: border-box;
		width: 100%;
		height: 100vh;
		border-left: 3px solid var(--colour-btn-back);
		transition: .25s;
		z-index: 101;
	}

	#navigation-content > * {
		box-sizing: border-box;
		padding: 10px;
		width: 100%;
	}

	#nav-main {
		display: flex;
		flex-grow: 1;
		flex-direction: column;
		flex-wrap: nowrap;
		justify-content: flex-start;
		gap: 10px;
		overflow: auto;
	}

	#nav-main > #block-view > a > h1 {
		font-size: 100%;
	}
</style>
