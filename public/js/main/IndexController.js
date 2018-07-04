import PostsView from './views/Posts';
import ToastsView from './views/Toasts';
import idb from 'idb';

export default function IndexController(container) {
  this._container = container;
  this._postsView = new PostsView(this._container);
  this._toastsView = new ToastsView(this._container);
  this._lostConnectionToast = null;
  this._openSocket();
  this._registerServiceWorker();
}

IndexController.prototype._registerServiceWorker = function() {
  if (!navigator.serviceWorker) return;

  var indexController = this;

  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    // Udacity hint
    // TODO: if there's no controller, this page wasn't loaded
    // via a service worker, so they're looking at the latest version.
    // In that case, exit early

    // Douglas' Comments
    //Eu não entendi pq temos que verificar se o arquivo é controlado ou não por um sw =/
    if(!navigator.serviceWorker.controller){
      return
    }

    // Udacity hint
    // TODO: if there's an updated worker already waiting, call
    // indexController._updateReady()
    if(reg.waiting){
      // there's an update ready!
      indexController._updateReady()
      return;
    }

    // Udacity hint
    // TODO: if there's an updated worker installing, track its
    // progress. If it becomes "installed", call
    // indexController._updateReady()
    if(reg.installing){
      console.log('ola installing')
      indexController._trackInstalling(reg.installing)
      return
      // there's an uptade in progress
      //reg.installing.addEventListener('statechange', function(){
        /**
         * Douglas' Comments
         * Qual é o contexto desse 'this' IndezController ou reg ? Eu tentei dar um console.log 
         * nesse this, porém é como se meu sw nunca passasse por essa fase, desse modo não conseguo ver o console.
         * Eu imaginei que eu deveria utilizar arraw funtion para garantir que o this se refere a reg, mas não tenho
         * certeza. Não sei se o this de 'this.state' é realmente o objeto de reg.installing
         */
        //if(this.state == 'installed'){
        //  indexController._updateReady()
        //}
      //})
    }

    // Udacity hint
    // TODO: otherwise, listen for new installing workers arriving.
    // If one arrives, track its progress.
    // If it becomes "installed", call
    // indexController._updateReady()
    /**
     * Também tenho dúvida em relação ao this abaixo, e o grande problemaque é se minha app não identificasse
     * as atualizações que faço no sw. Desse modo não consigo acessar esse evento e ver o contexto do this.
     * Eu tinha em mente que com function, o this tem o contexto de quem o chama, então nesse caso seria reg, pois 
     * chamamos a função anônima como parâmetro de addEventListener de reg. Está correto pensar assim?
     */
    reg.addEventListener('uptadefound', function() {
      console.log('ola uptade found')
      indexController._trackInstalling(reg.installing)
    })
    /**
     * Por fim eu fiz os testes do códido e segundo o sisteminha de testes oferecido no curso, eu conseguir completar 
     * a tarefa. Porém não entendi, por qual motivo não consigo logar os 'this' acima, mesmo atualizando e instalando 
     * os estados de reg no arquivo do sw :(
     */
  });
};

IndexController.prototype._trackInstalling = function(worker){
  var indexController = this;

  worker.addEventListener('statechange', function(){
    if(worker.state == 'installed'){
      indexController._updateReady()
    }
  })

}

IndexController.prototype._updateReady = function() {
  var toast = this._toastsView.show("New version available", {
    buttons: ['whatever']
  });
};

// open a connection to the server for live updates
IndexController.prototype._openSocket = function() {
  var indexController = this;
  var latestPostDate = this._postsView.getLatestPostDate();

  // create a url pointing to /updates with the ws protocol
  var socketUrl = new URL('/updates', window.location);
  socketUrl.protocol = 'ws';

  if (latestPostDate) {
    socketUrl.search = 'since=' + latestPostDate.valueOf();
  }

  // this is a little hack for the settings page's tests,
  // it isn't needed for Wittr
  socketUrl.search += '&' + location.search.slice(1);

  var ws = new WebSocket(socketUrl.href);

  // add listeners
  ws.addEventListener('open', function() {
    if (indexController._lostConnectionToast) {
      indexController._lostConnectionToast.hide();
    }
  });

  ws.addEventListener('message', function(event) {
    requestAnimationFrame(function() {
      indexController._onSocketMessage(event.data);
    });
  });

  ws.addEventListener('close', function() {
    // tell the user
    if (!indexController._lostConnectionToast) {
      indexController._lostConnectionToast = indexController._toastsView.show("Unable to connect. Retrying…");
    }

    // try and reconnect in 5 seconds
    setTimeout(function() {
      indexController._openSocket();
    }, 5000);
  });
};

// called when the web socket sends message data
IndexController.prototype._onSocketMessage = function(data) {
  var messages = JSON.parse(data);
  this._postsView.addPosts(messages);
};