<template>
  <div>
    <b-navbar toggleable="md" type="dark" variant="primary">

      <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>

      <b-navbar-brand href="#">
        <i class="fa fa-user-md fa-2x" aria-hidden="true"></i>
        Med Share
      </b-navbar-brand>

      <b-collapse is-nav id="nav_collapse">

        <!-- Right aligned nav items -->
        <b-navbar-nav class="ml-auto">

          <b-nav-form>
            <div v-if="loggedIn" class="text-white">
              <i class="fa fa-user fa-2x align-middle" aria-hidden="true"></i>
              {{ this.$session.get('id') }}
              <b-btn @click="logout" variant="danger" class="ml-2">Logout</b-btn>
            </div>
            <div v-else>
              <b-btn v-b-modal.login variant="warning">Login</b-btn>
              <b-btn v-b-modal.register variant="primary">Register</b-btn>
            </div>
          </b-nav-form>


        </b-navbar-nav>

      </b-collapse>
    </b-navbar>

    <b-jumbotron header="Share your files" lead="Your data can help">
      <vue-dropzone ref="myVueDropzone" id="dropzone" :options="dropzoneOptions" v-on:vdropzone-file-added="fileAdded" />          
    </b-jumbotron>

    <b-container fluid class="">
      <b-row>
          <b-col>
              <h3>Your files</h3>              
              <b-col cols="6" height="100%" v-for="file in files" :key="file.hash" @click="viewFile(file)" variant="light" class="border d-inline-block py-3 text-truncate">
                <a href="#">
                  <i class="fa fa-file-text-o fa-3x d-block" aria-hidden="true"></i>
                  <i class="fa fa-unlock fa" aria-hidden="true"></i> {{ file.filename }} {{ file.hash }}
                </a>
              </b-col>

          </b-col>

          <b-col class="border-left">
              <h3>Data Marketplace</h3>              
              <b-col cols="6" height="100%" v-for="file in globalFiles" :key="file.hash" @click="viewFile(file)" variant="light" class="border d-inline-block py-3 text-truncate">
                <a href="#">
                  <i class="fa fa-file-text-o fa-3x d-block" aria-hidden="true"></i>
                  <i class="fa fa-unlock fa" aria-hidden="true"></i> {{ file.filename }} {{ file.hash }}
                </a>
              </b-col>
          </b-col>
      </b-row>
    </b-container>
      
    <!-- Modal Component -->
    <b-modal id="login" title="Login" @ok="login">
      <b-form @submit="login">

        <b-form-input id="loginEmailInput" type="email" v-model="loginForm.email" required placeholder="Enter email"></b-form-input>

        <b-form-input id="loginPasswordInput" type="password" v-model="loginForm.password" required placeholder="Enter password"></b-form-input>
      </b-form>
    </b-modal>

    <b-modal id="register" title="Register" @ok="register">
      <b-form @submit="register">

        <b-form-input id="registerEmailInput" type="email" v-model="registerForm.email" required placeholder="Enter email"></b-form-input>

        <b-form-input id="registerPasswordInput" type="password" v-model="registerForm.password" required placeholder="Enter password"></b-form-input>
        <b-form-input id="registerConfirmPasswordInput" type="password" v-model="registerForm.confirmPassword" required placeholder="Confirm password"></b-form-input>
      </b-form>
    </b-modal>
  </div>
</template>

<script>
import vue2Dropzone from 'vue2-dropzone'
import 'vue2-dropzone/dist/vue2Dropzone.css'
import axios from 'axios'

export default {
  name: 'Home',
  components: {
    vueDropzone: vue2Dropzone
  },
  data () {
    return {
      dropzoneOptions: {
        paramName: 'files',
        url: 'http://localhost:3000/upload',
        thumbnailWidth: 150,
        maxFilesize: 0.5,
        // headers: { 'My-Awesome-Header': 'header value' },
        dictDefaultMessage: "<i class='fa fa-cloud-upload'></i> UPLOAD ME",
        headers: { Authorization: `Bearer ${this.$session.get('token')}` }
      },
      files: [],
      globalFiles: [],
      loggedIn: false,
      loginForm: {
        email: '',
        password: ''
      },
      registerForm: {
        email: '',
        password: '',
        confirmPassword: ''
      }
    }
  },
  mounted () {
    this.loggedIn = this.$session.exists()
    if (this.loggedIn) {
      this.populateFileView()
    } else {
      this.files = []
    }
  },
  methods: {
    fileAdded (file) {
      console.log(file)
    },
    viewFile (file) {
      console.log(file.hash)
      window.open(`http://localhost:3000/file/${file.hash}`)
    },
    login (evt) {
      // evt.preventDefault()
      axios.post('http://localhost:3000/login', {
        email: this.loginForm.email,
        password: this.loginForm.password
      }).then(result => {
        console.log(result)
        if (result.data.valid) {
          this.$session.start()
          this.$session.set('token', result.data.token)
          this.$session.set('id', result.data.payload.email)
          console.log(this.$session)
          this.loggedIn = true

          this.populateFileView()
        }
      })
    },
    register (evt) {
      // evt.preventDefault()
      axios.post('http://localhost:3000/register', {
        email: this.registerForm.email,
        password: this.registerForm.password
      }).then(result => {
        console.log(result)
      })
    },
    logout () {
      this.$session.destroy()
      this.loggedIn = false
    },
    populateFileView () {
      this.files = []
      axios.get('http://localhost:3000/hashes/false', { headers: { Authorization: `Bearer ${this.$session.get('token')}` } }).then(result => {
        console.log(result)
        result.data.forEach(hash => {
          axios.get(`http://localhost:3000/filename/${hash}`, { headers: { Authorization: `Bearer ${this.$session.get('token')}` } }).then(result => {
            const filename = result.data
            this.files.push({ hash: hash, filename: filename })
          })
        })
        console.log('files : ' + this.files)
        this.globalFiles = []
        axios.get('http://localhost:3000/hashes/true', { headers: { Authorization: `Bearer ${this.$session.get('token')}` } }).then(result => {
          console.log(result)
          result.data.forEach(hash => {
            let owned = false
            this.files.forEach(file => {
              owned |= (file.hash === hash)
            })
            console.log(owned)
            if (!owned) {
              axios.get(`http://localhost:3000/filename/${hash}`, { headers: { Authorization: `Bearer ${this.$session.get('token')}` } }).then(result => {
                console.log(result)
                const filename = result.data
                this.globalFiles.push({ hash: hash, filename: filename })
              })
            }
          })
        })
      })
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.dropzone {
    border: 2px dashed #0087F7;
}
/* h1,
h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
} */
</style>
