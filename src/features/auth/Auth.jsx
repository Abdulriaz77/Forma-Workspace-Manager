import { useState } from 'react';
import { uid } from '../../lib/data';
export default function Auth({ data, commit }) {
  const [signup, setSignup] = useState(false),
    [error, setError] = useState('');
  function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    let user = data.users.find((u) => u.email.toLowerCase() === f.email.toLowerCase());
    if (signup) {
      if (user) return setError('This email already has an account.');
      user = {
        id: uid(),
        name: f.name.trim(),
        email: f.email.toLowerCase(),
        password: f.password,
        avatar: f.name.slice(0, 2).toUpperCase(),
      };
      commit(
        (d) => {
          d.users.push(user);
          d.session = user.id;
          d.workspaceId = null;
          d.projectId = null;
        },
        'Account created',
        false,
        true,
      );
    } else {
      if (!user || user.password !== f.password) return setError('Email or password is incorrect.');
      commit(
        (d) => {
          d.session = user.id;
          const w = d.workspaces.find((w) => w.members.some((m) => m.userId === user.id));
          d.workspaceId = w?.id;
          d.projectId = d.projects.find((p) => p.workspaceId === w?.id)?.id;
        },
        'Welcome back',
        false,
        true,
      );
    }
  }
  return (
    <main className="auth">
      <section className="auth-story">
        <div className="brand">
          ◈ forma<span>WORKSPACE</span>
        </div>
        <div>
          <span className="eyebrow">LESS CHAOS. MORE CLARITY.</span>
          <h1>
            Good work starts
            <br />
            with a little space.
          </h1>
          <p>
            Your projects, people, and next big ideas.
            <br />
            Together in one thoughtful workspace.
          </p>
          <div className="auth-art">
            <span>✦</span>
            <div>
              Website redesign <small>Moving ideas forward</small>
              <div className="progress">
                <i />
              </div>
            </div>
          </div>
        </div>
        <small>A calmer place to make things happen.</small>
      </section>
      <section className="auth-form">
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2>{signup ? 'Make room for great work.' : 'Welcome back.'}</h2>
          <p className="muted">
            {signup
              ? 'Create your local demo account.'
              : 'Sign in to your workspace and pick up where you left off.'}
          </p>
          <form onSubmit={submit}>
            {signup && (
              <label>
                Full name
                <input name="name" required maxLength={60} />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" defaultValue="alex@demo.com" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                defaultValue="demo123"
                minLength={6}
                required
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary">{signup ? 'Create account' : 'Sign in'} →</button>
          </form>
          <button
            className="text-button"
            onClick={() => {
              setSignup(!signup);
              setError('');
            }}
          >
            {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </button>
          <aside className="demo-note">
            Demo workspace · alex@demo.com / demo123
            <br />
            Local simulation only. Don’t use a real password.
          </aside>
        </div>
      </section>
    </main>
  );
}
