
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    //Insert store variables here
    const tokoen = writable(" eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyTmFtZSI6Ijk0OTAwNTQ4NkBxcS5jb20iLCJleHAiOjE2MTMyMTU2MTMsImlhdCI6MTYxMzEyOTIxMywiaXNzIjoiYXdlTGlzdCJ9.g3JKHINnQvqsw9H1-phS_ma-08DGzLx5dQRv8McRnJU");
    const pagedd = writable("neno");//neno(NENO),dayily(每日回顾),luck(每日漫步),setting(设置)
    const settingStrore = writable({ platform: "七牛", domain: "http://img.neno.bijiduo.com" });//neno(NENO),dayily(每日回顾),luck(每日漫步),setting(设置)
    const countStrore = writable({ tagCount: 0, nenoCount: 0, dayCount: 0, dateCount: {} });

    const tagStrore = writable({ pinTags:[],allTags:[]});

    tokoen.subscribe(value => {
    });
    const baseurl = "http://127.0.0.1:3000";
    // const baseurl = "https://b9c21f2efdc44e2792d2ac7cbb8feff4.apig.cn-north-4.huaweicloudapis.com"
    // const baseurl = "https://fmolo.bijiduo.com"
    function genergeParams(data) {
        return {
            body: JSON.stringify(data),
            method: "post",
            headers: {
                'content-type': 'application/json'
            },
            mode: "cors",
        }

    }
    const getAllFmolo = (data) => {
        return fetch(`${baseurl}/find`, genergeParams(data))
    };
    const addFmolo = (data) => {
        return fetch(`${baseurl}/addNeno`, genergeParams(data))
    };
    const detail = (data) => {
        return fetch(`${baseurl}/detail`, genergeParams(data))
    };
    const deleteOne = (data) => {
        return fetch(`${baseurl}/delete`, genergeParams(data))
    };
    const tags = (data) => {
        return fetch(`${baseurl}/tags`, genergeParams(data))
    };
    const pin = (data) => {
        return fetch(`${baseurl}/pin`, genergeParams(data))
    };
    const pins = (data) => {
        return fetch(`${baseurl}/pins`, genergeParams(data))
    };
    const search = (data) => {
        return fetch(`${baseurl}/search`, genergeParams(data))
    };
    const qiniuToken = (data) => {
        return fetch(`${baseurl}/qiniu`, genergeParams(data))
    };
    const setting = (data) => {
        return fetch(`${baseurl}/setting`, genergeParams(data))
    };
    const count = (data) => {
        return fetch(`${baseurl}/count`, genergeParams(data))
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var dayjs_min = createCommonjsModule(function (module, exports) {
    !function(t,e){module.exports=e();}(commonjsGlobal,function(){var t="millisecond",e="second",n="minute",r="hour",i="day",s="week",u="month",a="quarter",o="year",f="date",h=/^(\d{4})[-/]?(\d{1,2})?[-/]?(\d{0,2})[^0-9]*(\d{1,2})?:?(\d{1,2})?:?(\d{1,2})?[.:]?(\d+)?$/,c=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,d={name:"en",weekdays:"Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),months:"January_February_March_April_May_June_July_August_September_October_November_December".split("_")},$=function(t,e,n){var r=String(t);return !r||r.length>=e?t:""+Array(e+1-r.length).join(n)+t},l={s:$,z:function(t){var e=-t.utcOffset(),n=Math.abs(e),r=Math.floor(n/60),i=n%60;return (e<=0?"+":"-")+$(r,2,"0")+":"+$(i,2,"0")},m:function t(e,n){if(e.date()<n.date())return -t(n,e);var r=12*(n.year()-e.year())+(n.month()-e.month()),i=e.clone().add(r,u),s=n-i<0,a=e.clone().add(r+(s?-1:1),u);return +(-(r+(n-i)/(s?i-a:a-i))||0)},a:function(t){return t<0?Math.ceil(t)||0:Math.floor(t)},p:function(h){return {M:u,y:o,w:s,d:i,D:f,h:r,m:n,s:e,ms:t,Q:a}[h]||String(h||"").toLowerCase().replace(/s$/,"")},u:function(t){return void 0===t}},y="en",M={};M[y]=d;var m=function(t){return t instanceof S},D=function(t,e,n){var r;if(!t)return y;if("string"==typeof t)M[t]&&(r=t),e&&(M[t]=e,r=t);else {var i=t.name;M[i]=t,r=i;}return !n&&r&&(y=r),r||!n&&y},v=function(t,e){if(m(t))return t.clone();var n="object"==typeof e?e:{};return n.date=t,n.args=arguments,new S(n)},g=l;g.l=D,g.i=m,g.w=function(t,e){return v(t,{locale:e.$L,utc:e.$u,x:e.$x,$offset:e.$offset})};var S=function(){function d(t){this.$L=D(t.locale,null,!0),this.parse(t);}var $=d.prototype;return $.parse=function(t){this.$d=function(t){var e=t.date,n=t.utc;if(null===e)return new Date(NaN);if(g.u(e))return new Date;if(e instanceof Date)return new Date(e);if("string"==typeof e&&!/Z$/i.test(e)){var r=e.match(h);if(r){var i=r[2]-1||0,s=(r[7]||"0").substring(0,3);return n?new Date(Date.UTC(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)):new Date(r[1],i,r[3]||1,r[4]||0,r[5]||0,r[6]||0,s)}}return new Date(e)}(t),this.$x=t.x||{},this.init();},$.init=function(){var t=this.$d;this.$y=t.getFullYear(),this.$M=t.getMonth(),this.$D=t.getDate(),this.$W=t.getDay(),this.$H=t.getHours(),this.$m=t.getMinutes(),this.$s=t.getSeconds(),this.$ms=t.getMilliseconds();},$.$utils=function(){return g},$.isValid=function(){return !("Invalid Date"===this.$d.toString())},$.isSame=function(t,e){var n=v(t);return this.startOf(e)<=n&&n<=this.endOf(e)},$.isAfter=function(t,e){return v(t)<this.startOf(e)},$.isBefore=function(t,e){return this.endOf(e)<v(t)},$.$g=function(t,e,n){return g.u(t)?this[e]:this.set(n,t)},$.unix=function(){return Math.floor(this.valueOf()/1e3)},$.valueOf=function(){return this.$d.getTime()},$.startOf=function(t,a){var h=this,c=!!g.u(a)||a,d=g.p(t),$=function(t,e){var n=g.w(h.$u?Date.UTC(h.$y,e,t):new Date(h.$y,e,t),h);return c?n:n.endOf(i)},l=function(t,e){return g.w(h.toDate()[t].apply(h.toDate("s"),(c?[0,0,0,0]:[23,59,59,999]).slice(e)),h)},y=this.$W,M=this.$M,m=this.$D,D="set"+(this.$u?"UTC":"");switch(d){case o:return c?$(1,0):$(31,11);case u:return c?$(1,M):$(0,M+1);case s:var v=this.$locale().weekStart||0,S=(y<v?y+7:y)-v;return $(c?m-S:m+(6-S),M);case i:case f:return l(D+"Hours",0);case r:return l(D+"Minutes",1);case n:return l(D+"Seconds",2);case e:return l(D+"Milliseconds",3);default:return this.clone()}},$.endOf=function(t){return this.startOf(t,!1)},$.$set=function(s,a){var h,c=g.p(s),d="set"+(this.$u?"UTC":""),$=(h={},h[i]=d+"Date",h[f]=d+"Date",h[u]=d+"Month",h[o]=d+"FullYear",h[r]=d+"Hours",h[n]=d+"Minutes",h[e]=d+"Seconds",h[t]=d+"Milliseconds",h)[c],l=c===i?this.$D+(a-this.$W):a;if(c===u||c===o){var y=this.clone().set(f,1);y.$d[$](l),y.init(),this.$d=y.set(f,Math.min(this.$D,y.daysInMonth())).$d;}else $&&this.$d[$](l);return this.init(),this},$.set=function(t,e){return this.clone().$set(t,e)},$.get=function(t){return this[g.p(t)]()},$.add=function(t,a){var f,h=this;t=Number(t);var c=g.p(a),d=function(e){var n=v(h);return g.w(n.date(n.date()+Math.round(e*t)),h)};if(c===u)return this.set(u,this.$M+t);if(c===o)return this.set(o,this.$y+t);if(c===i)return d(1);if(c===s)return d(7);var $=(f={},f[n]=6e4,f[r]=36e5,f[e]=1e3,f)[c]||1,l=this.$d.getTime()+t*$;return g.w(l,this)},$.subtract=function(t,e){return this.add(-1*t,e)},$.format=function(t){var e=this;if(!this.isValid())return "Invalid Date";var n=t||"YYYY-MM-DDTHH:mm:ssZ",r=g.z(this),i=this.$locale(),s=this.$H,u=this.$m,a=this.$M,o=i.weekdays,f=i.months,h=function(t,r,i,s){return t&&(t[r]||t(e,n))||i[r].substr(0,s)},d=function(t){return g.s(s%12||12,t,"0")},$=i.meridiem||function(t,e,n){var r=t<12?"AM":"PM";return n?r.toLowerCase():r},l={YY:String(this.$y).slice(-2),YYYY:this.$y,M:a+1,MM:g.s(a+1,2,"0"),MMM:h(i.monthsShort,a,f,3),MMMM:h(f,a),D:this.$D,DD:g.s(this.$D,2,"0"),d:String(this.$W),dd:h(i.weekdaysMin,this.$W,o,2),ddd:h(i.weekdaysShort,this.$W,o,3),dddd:o[this.$W],H:String(s),HH:g.s(s,2,"0"),h:d(1),hh:d(2),a:$(s,u,!0),A:$(s,u,!1),m:String(u),mm:g.s(u,2,"0"),s:String(this.$s),ss:g.s(this.$s,2,"0"),SSS:g.s(this.$ms,3,"0"),Z:r};return n.replace(c,function(t,e){return e||l[t]||r.replace(":","")})},$.utcOffset=function(){return 15*-Math.round(this.$d.getTimezoneOffset()/15)},$.diff=function(t,f,h){var c,d=g.p(f),$=v(t),l=6e4*($.utcOffset()-this.utcOffset()),y=this-$,M=g.m(this,$);return M=(c={},c[o]=M/12,c[u]=M,c[a]=M/3,c[s]=(y-l)/6048e5,c[i]=(y-l)/864e5,c[r]=y/36e5,c[n]=y/6e4,c[e]=y/1e3,c)[d]||y,h?M:g.a(M)},$.daysInMonth=function(){return this.endOf(u).$D},$.$locale=function(){return M[this.$L]},$.locale=function(t,e){if(!t)return this.$L;var n=this.clone(),r=D(t,e,!0);return r&&(n.$L=r),n},$.clone=function(){return g.w(this.$d,this)},$.toDate=function(){return new Date(this.valueOf())},$.toJSON=function(){return this.isValid()?this.toISOString():null},$.toISOString=function(){return this.$d.toISOString()},$.toString=function(){return this.$d.toUTCString()},d}(),p=S.prototype;return v.prototype=p,[["$ms",t],["$s",e],["$m",n],["$H",r],["$W",i],["$M",u],["$y",o],["$D",f]].forEach(function(t){p[t[1]]=function(e){return this.$g(e,t[0],t[1])};}),v.extend=function(t,e){return t.$i||(t(e,S,v),t.$i=!0),v},v.locale=D,v.isDayjs=m,v.unix=function(t){return v(1e3*t)},v.en=M[y],v.Ls=M,v.p={},v});
    });

    /* src\components\GreenMap.svelte generated by Svelte v3.32.3 */
    const file = "src\\components\\GreenMap.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[12] = list;
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (65:20) {#if day.hover}
    function create_if_block(ctx) {
    	let div;
    	let t0_value = /*day*/ ctx[11].count + "";
    	let t0;
    	let t1;
    	let t2_value = /*day*/ ctx[11].date + "";
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(" nenos on ");
    			t2 = text(t2_value);
    			attr_dev(div, "class", "absolute  bg-gray-800 text-white text-sm rounded-sm pl-2 pr-2 pt-1 pb-1 z-50 w-48 flex justify-center items-center");
    			set_style(div, "top", "-2rem");
    			add_location(div, file, 65, 24, 2313);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    			append_dev(div, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*gmap*/ 1 && t0_value !== (t0_value = /*day*/ ctx[11].count + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*gmap*/ 1 && t2_value !== (t2_value = /*day*/ ctx[11].date + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(65:20) {#if day.hover}",
    		ctx
    	});

    	return block;
    }

    // (47:12) {#each week as day}
    function create_each_block_1(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let mounted;
    	let dispose;

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[3](/*day*/ ctx[11], /*each_value_1*/ ctx[12], /*day_index*/ ctx[13]);
    	}

    	function mouseleave_handler() {
    		return /*mouseleave_handler*/ ctx[4](/*day*/ ctx[11], /*each_value_1*/ ctx[12], /*day_index*/ ctx[13]);
    	}

    	let if_block = /*day*/ ctx[11].hover && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "rounded-sm w-4 h-4 z-0 ");
    			toggle_class(div0, "border-green-500", /*day*/ ctx[11].date == /*toDay*/ ctx[1]);
    			toggle_class(div0, "border-soild", /*day*/ ctx[11].date == /*toDay*/ ctx[1]);
    			toggle_class(div0, "bg-gray-300", /*day*/ ctx[11].count == 0);
    			toggle_class(div0, "bg-green-300", /*day*/ ctx[11].count > 0 && /*day*/ ctx[11].count <= 3);
    			toggle_class(div0, "bg-green-400", /*day*/ ctx[11].count > 3 && /*day*/ ctx[11].count <= 8);
    			toggle_class(div0, "bg-green-600", /*day*/ ctx[11].count > 8);
    			toggle_class(div0, "border-2", /*day*/ ctx[11].date == /*toDay*/ ctx[1]);
    			add_location(div0, file, 48, 20, 1450);
    			attr_dev(div1, "class", "  relative flex justify-center items-center ");
    			add_location(div1, file, 47, 16, 1370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t);
    			if (if_block) if_block.m(div1, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div0, "mouseenter", mouseenter_handler, false, false, false),
    					listen_dev(div0, "mouseleave", mouseleave_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*gmap, toDay*/ 3) {
    				toggle_class(div0, "border-green-500", /*day*/ ctx[11].date == /*toDay*/ ctx[1]);
    			}

    			if (dirty & /*gmap, toDay*/ 3) {
    				toggle_class(div0, "border-soild", /*day*/ ctx[11].date == /*toDay*/ ctx[1]);
    			}

    			if (dirty & /*gmap*/ 1) {
    				toggle_class(div0, "bg-gray-300", /*day*/ ctx[11].count == 0);
    			}

    			if (dirty & /*gmap*/ 1) {
    				toggle_class(div0, "bg-green-300", /*day*/ ctx[11].count > 0 && /*day*/ ctx[11].count <= 3);
    			}

    			if (dirty & /*gmap*/ 1) {
    				toggle_class(div0, "bg-green-400", /*day*/ ctx[11].count > 3 && /*day*/ ctx[11].count <= 8);
    			}

    			if (dirty & /*gmap*/ 1) {
    				toggle_class(div0, "bg-green-600", /*day*/ ctx[11].count > 8);
    			}

    			if (dirty & /*gmap, toDay*/ 3) {
    				toggle_class(div0, "border-2", /*day*/ ctx[11].date == /*toDay*/ ctx[1]);
    			}

    			if (/*day*/ ctx[11].hover) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(47:12) {#each week as day}",
    		ctx
    	});

    	return block;
    }

    // (45:4) {#each gmap as week}
    function create_each_block(ctx) {
    	let div;
    	let each_value_1 = /*week*/ ctx[8];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", " space-y-1 ");
    			add_location(div, file, 45, 8, 1294);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*gmap, toDay*/ 3) {
    				each_value_1 = /*week*/ ctx[8];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(45:4) {#each gmap as week}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div1;
    	let t;
    	let div0;
    	let each_value = /*gmap*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			div0 = element("div");
    			add_location(div0, file, 76, 4, 2743);
    			attr_dev(div1, "class", "w-full flex justify-between pl-1 ");
    			add_location(div1, file, 43, 0, 1211);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div1, t);
    			append_dev(div1, div0);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*gmap, toDay*/ 3) {
    				each_value = /*gmap*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("GreenMap", slots, []);
    	let { countDate = {} } = $$props;
    	let weekCount = 12;
    	let weekDay = 7;
    	let gmap = [];
    	let toDay = dayjs_min().format("YYYY-MM-DD");

    	function name(params) {
    		let tmap = [];
    		let startDay = weekCount * weekDay - (weekDay - dayjs_min().day() + 1);

    		for (let week = 0; week < weekCount; week++) {
    			let dmap = [];

    			for (let day = 0; day < weekDay; day++) {
    				let count = 0;
    				let date = dayjs_min().subtract(startDay, "day").format("YYYY-MM-DD");
    				count = countDate[date];

    				if (count == undefined) {
    					count = 0;
    				}

    				dmap = [...dmap, { date, count, hover: false }];
    				startDay--;
    			}

    			tmap = [...tmap, dmap];
    		}

    		$$invalidate(0, gmap = tmap);
    	}

    	const writable_props = ["countDate"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<GreenMap> was created with unknown prop '${key}'`);
    	});

    	const mouseenter_handler = (day, each_value_1, day_index) => {
    		$$invalidate(0, each_value_1[day_index].hover = true, gmap);
    	};

    	const mouseleave_handler = (day, each_value_1, day_index) => {
    		$$invalidate(0, each_value_1[day_index].hover = false, gmap);
    	};

    	$$self.$$set = $$props => {
    		if ("countDate" in $$props) $$invalidate(2, countDate = $$props.countDate);
    	};

    	$$self.$capture_state = () => ({
    		dayjs: dayjs_min,
    		onMount,
    		countDate,
    		weekCount,
    		weekDay,
    		gmap,
    		toDay,
    		name
    	});

    	$$self.$inject_state = $$props => {
    		if ("countDate" in $$props) $$invalidate(2, countDate = $$props.countDate);
    		if ("weekCount" in $$props) weekCount = $$props.weekCount;
    		if ("weekDay" in $$props) weekDay = $$props.weekDay;
    		if ("gmap" in $$props) $$invalidate(0, gmap = $$props.gmap);
    		if ("toDay" in $$props) $$invalidate(1, toDay = $$props.toDay);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*countDate*/ 4) {
    			 {
    				name();
    			}
    		}
    	};

    	return [gmap, toDay, countDate, mouseenter_handler, mouseleave_handler];
    }

    class GreenMap extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { countDate: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "GreenMap",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get countDate() {
    		throw new Error("<GreenMap>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set countDate(value) {
    		throw new Error("<GreenMap>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\SideLeft.svelte generated by Svelte v3.32.3 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$1 = "src\\components\\SideLeft.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i]._id;
    	child_ctx[17] = list[i].tag;
    	return child_ctx;
    }

    // (170:4) {#if pinTags.length != 0}
    function create_if_block_1(ctx) {
    	let div;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = /*pinTags*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "置顶";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(div, "class", " p-4 w-full text-sm");
    			add_location(div, file$1, 170, 8, 5367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pinNeno, pinTags*/ 34) {
    				each_value_1 = /*pinTags*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(170:4) {#if pinTags.length != 0}",
    		ctx
    	});

    	return block;
    }

    // (173:8) {#each pinTags as { _id, tag }}
    function create_each_block_1$1(ctx) {
    	let button1;
    	let t0_value = /*tag*/ ctx[17] + "";
    	let t0;
    	let t1;
    	let button0;
    	let i;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[10](/*tag*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			button1 = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			button0 = element("button");
    			i = element("i");
    			t2 = space();
    			attr_dev(i, "class", "ri-pushpin-fill");
    			add_location(i, file$1, 183, 20, 5908);
    			attr_dev(button0, "class", "focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2");
    			add_location(button0, file$1, 177, 16, 5658);
    			attr_dev(button1, "class", "rounded-r  group p-4 pt-2 pb-2  focus:outline-none w-full hover:bg-gray-200 flex justify-between text-sm");
    			add_location(button1, file$1, 173, 12, 5465);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t0);
    			append_dev(button1, t1);
    			append_dev(button1, button0);
    			append_dev(button0, i);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", click_handler_4, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*pinTags*/ 2 && t0_value !== (t0_value = /*tag*/ ctx[17] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(173:8) {#each pinTags as { _id, tag }}",
    		ctx
    	});

    	return block;
    }

    // (190:4) {#if allTags.length != 0}
    function create_if_block$1(ctx) {
    	let div;
    	let t1;
    	let each_1_anchor;
    	let each_value = /*allTags*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "标签";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr_dev(div, "class", "  p-4 pt-2 pb-2 w-full text-sm");
    			add_location(div, file$1, 190, 8, 6058);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pinNeno, allTags*/ 33) {
    				each_value = /*allTags*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(190:4) {#if allTags.length != 0}",
    		ctx
    	});

    	return block;
    }

    // (193:8) {#each allTags as tag}
    function create_each_block$1(ctx) {
    	let button1;
    	let t0_value = /*tag*/ ctx[17] + "";
    	let t0;
    	let t1;
    	let button0;
    	let i;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_5() {
    		return /*click_handler_5*/ ctx[11](/*tag*/ ctx[17]);
    	}

    	const block = {
    		c: function create() {
    			button1 = element("button");
    			t0 = text(t0_value);
    			t1 = space();
    			button0 = element("button");
    			i = element("i");
    			t2 = space();
    			attr_dev(i, "class", "ri-pushpin-2-fill");
    			add_location(i, file$1, 203, 20, 6599);
    			attr_dev(button0, "class", "focus:outline-none group-hover:opacity-100 opacity-0  pl-2 pr-2");
    			add_location(button0, file$1, 197, 16, 6350);
    			attr_dev(button1, "class", "rounded-r  group p-4 pt-2 pb-2 focus:outline-none w-full hover:bg-gray-200 flex justify-between text-sm");
    			add_location(button1, file$1, 193, 12, 6158);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t0);
    			append_dev(button1, t1);
    			append_dev(button1, button0);
    			append_dev(button0, i);
    			append_dev(button1, t2);

    			if (!mounted) {
    				dispose = listen_dev(button0, "click", click_handler_5, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*allTags*/ 1 && t0_value !== (t0_value = /*tag*/ ctx[17] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(193:8) {#each allTags as tag}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div11;
    	let div2;
    	let div1;
    	let t0;
    	let div0;
    	let t2;
    	let button0;
    	let i0;
    	let t3;
    	let greenmap;
    	let t4;
    	let div9;
    	let div4;
    	let div3;
    	let t5_value = /*$countStrore*/ ctx[4].nenoCount + "";
    	let t5;
    	let t6;
    	let t7;
    	let div6;
    	let div5;
    	let t8_value = /*$countStrore*/ ctx[4].tagCount + "";
    	let t8;
    	let t9;
    	let t10;
    	let div8;
    	let div7;
    	let t11_value = /*$countStrore*/ ctx[4].dayCount + "";
    	let t11;
    	let t12;
    	let t13;
    	let div10;
    	let button1;
    	let i1;
    	let t14;
    	let button1_class_value;
    	let t15;
    	let button2;
    	let i2;
    	let t16;
    	let button2_class_value;
    	let t17;
    	let button3;
    	let i3;
    	let t18;
    	let button3_class_value;
    	let t19;
    	let t20;
    	let current;
    	let mounted;
    	let dispose;

    	greenmap = new GreenMap({
    			props: {
    				countDate: /*$countStrore*/ ctx[4].countDate
    			},
    			$$inline: true
    		});

    	let if_block0 = /*pinTags*/ ctx[1].length != 0 && create_if_block_1(ctx);
    	let if_block1 = /*allTags*/ ctx[0].length != 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div11 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			t0 = text("FMOLOER\r\n            ");
    			div0 = element("div");
    			div0.textContent = "FREE";
    			t2 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t3 = space();
    			create_component(greenmap.$$.fragment);
    			t4 = space();
    			div9 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			t5 = text(t5_value);
    			t6 = text("\r\n            NENO");
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			t8 = text(t8_value);
    			t9 = text("\r\n            TAGS");
    			t10 = space();
    			div8 = element("div");
    			div7 = element("div");
    			t11 = text(t11_value);
    			t12 = text("\r\n            DAY");
    			t13 = space();
    			div10 = element("div");
    			button1 = element("button");
    			i1 = element("i");
    			t14 = text("NENO");
    			t15 = space();
    			button2 = element("button");
    			i2 = element("i");
    			t16 = text("每日回顾");
    			t17 = space();
    			button3 = element("button");
    			i3 = element("i");
    			t18 = text("随机漫步");
    			t19 = space();
    			if (if_block0) if_block0.c();
    			t20 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "text-sm rounded-sm bg-red-300 text-white p-1 pt-0 pb-0 ");
    			add_location(div0, file$1, 99, 12, 3051);
    			attr_dev(div1, "class", "flex  items-center justify-between");
    			add_location(div1, file$1, 97, 8, 2968);
    			attr_dev(i0, "class", "ri-settings-fill");
    			add_location(i0, file$1, 112, 12, 3419);
    			attr_dev(button0, "class", "focus:outline-none");
    			add_location(button0, file$1, 105, 8, 3219);
    			attr_dev(div2, "class", "flex  items-center justify-between  text-gray-600 w-full p-4 font-bold");
    			add_location(div2, file$1, 94, 4, 2859);
    			attr_dev(div3, "class", "text-xl");
    			add_location(div3, file$1, 119, 12, 3656);
    			attr_dev(div4, "class", "font-bold text-lg");
    			add_location(div4, file$1, 118, 8, 3611);
    			attr_dev(div5, "class", "text-xl");
    			add_location(div5, file$1, 123, 12, 3796);
    			attr_dev(div6, "class", "font-bold text-lg");
    			add_location(div6, file$1, 122, 8, 3751);
    			attr_dev(div7, "class", "text-xl");
    			add_location(div7, file$1, 127, 12, 3935);
    			attr_dev(div8, "class", "font-bold text-lg");
    			add_location(div8, file$1, 126, 8, 3890);
    			attr_dev(div9, "class", "flex justify-around  w-full mt-4 text-gray-500");
    			add_location(div9, file$1, 117, 4, 3541);
    			attr_dev(i1, "class", "ri-quill-pen-fill mr-2");
    			add_location(i1, file$1, 142, 12, 4472);

    			attr_dev(button1, "class", button1_class_value = "" + ("    bu-op hover:text-white hover:bg-green-400 " + (/*checkedIndex*/ ctx[2] == "neno"
    			? "bg-green-500 text-white"
    			: "") + "        " + " svelte-8b3ze5"));

    			add_location(button1, file$1, 132, 8, 4119);
    			attr_dev(i2, "class", "ri-calendar-event-fill mr-2");
    			add_location(i2, file$1, 154, 12, 4863);

    			attr_dev(button2, "class", button2_class_value = "" + ("    bu-op hover:text-white hover:bg-green-400 " + (/*checkedIndex*/ ctx[2] == "daily"
    			? "bg-green-500 text-white"
    			: "") + "        " + " svelte-8b3ze5"));

    			add_location(button2, file$1, 145, 8, 4543);
    			attr_dev(i3, "class", "ri-bubble-chart-fill mr-2");
    			add_location(i3, file$1, 165, 12, 5250);

    			attr_dev(button3, "class", button3_class_value = "" + ("    bu-op hover:text-white hover:bg-green-400 " + (/*checkedIndex*/ ctx[2] == "luck"
    			? "bg-green-500 text-white"
    			: "") + "        " + " svelte-8b3ze5"));

    			add_location(button3, file$1, 156, 8, 4937);
    			attr_dev(div10, "class", "flex flex-col items-start text-sm text-gray-600 w-full mt-2");
    			add_location(div10, file$1, 131, 4, 4036);
    			attr_dev(div11, "class", "w-full");
    			add_location(div11, file$1, 93, 0, 2833);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div2);
    			append_dev(div2, div1);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div2, t2);
    			append_dev(div2, button0);
    			append_dev(button0, i0);
    			append_dev(div11, t3);
    			mount_component(greenmap, div11, null);
    			append_dev(div11, t4);
    			append_dev(div11, div9);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div3, t5);
    			append_dev(div4, t6);
    			append_dev(div9, t7);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div5, t8);
    			append_dev(div6, t9);
    			append_dev(div9, t10);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, t11);
    			append_dev(div8, t12);
    			append_dev(div11, t13);
    			append_dev(div11, div10);
    			append_dev(div10, button1);
    			append_dev(button1, i1);
    			append_dev(button1, t14);
    			append_dev(div10, t15);
    			append_dev(div10, button2);
    			append_dev(button2, i2);
    			append_dev(button2, t16);
    			append_dev(div10, t17);
    			append_dev(div10, button3);
    			append_dev(button3, i3);
    			append_dev(button3, t18);
    			append_dev(div11, t19);
    			if (if_block0) if_block0.m(div11, null);
    			append_dev(div11, t20);
    			if (if_block1) if_block1.m(div11, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[8], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const greenmap_changes = {};
    			if (dirty & /*$countStrore*/ 16) greenmap_changes.countDate = /*$countStrore*/ ctx[4].countDate;
    			greenmap.$set(greenmap_changes);
    			if ((!current || dirty & /*$countStrore*/ 16) && t5_value !== (t5_value = /*$countStrore*/ ctx[4].nenoCount + "")) set_data_dev(t5, t5_value);
    			if ((!current || dirty & /*$countStrore*/ 16) && t8_value !== (t8_value = /*$countStrore*/ ctx[4].tagCount + "")) set_data_dev(t8, t8_value);
    			if ((!current || dirty & /*$countStrore*/ 16) && t11_value !== (t11_value = /*$countStrore*/ ctx[4].dayCount + "")) set_data_dev(t11, t11_value);

    			if (!current || dirty & /*checkedIndex*/ 4 && button1_class_value !== (button1_class_value = "" + ("    bu-op hover:text-white hover:bg-green-400 " + (/*checkedIndex*/ ctx[2] == "neno"
    			? "bg-green-500 text-white"
    			: "") + "        " + " svelte-8b3ze5"))) {
    				attr_dev(button1, "class", button1_class_value);
    			}

    			if (!current || dirty & /*checkedIndex*/ 4 && button2_class_value !== (button2_class_value = "" + ("    bu-op hover:text-white hover:bg-green-400 " + (/*checkedIndex*/ ctx[2] == "daily"
    			? "bg-green-500 text-white"
    			: "") + "        " + " svelte-8b3ze5"))) {
    				attr_dev(button2, "class", button2_class_value);
    			}

    			if (!current || dirty & /*checkedIndex*/ 4 && button3_class_value !== (button3_class_value = "" + ("    bu-op hover:text-white hover:bg-green-400 " + (/*checkedIndex*/ ctx[2] == "luck"
    			? "bg-green-500 text-white"
    			: "") + "        " + " svelte-8b3ze5"))) {
    				attr_dev(button3, "class", button3_class_value);
    			}

    			if (/*pinTags*/ ctx[1].length != 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div11, t20);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*allTags*/ ctx[0].length != 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div11, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(greenmap.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(greenmap.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div11);
    			destroy_component(greenmap);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $pagedd;
    	let $countStrore;
    	let $tagStrore;
    	validate_store(pagedd, "pagedd");
    	component_subscribe($$self, pagedd, $$value => $$invalidate(3, $pagedd = $$value));
    	validate_store(countStrore, "countStrore");
    	component_subscribe($$self, countStrore, $$value => $$invalidate(4, $countStrore = $$value));
    	validate_store(tagStrore, "tagStrore");
    	component_subscribe($$self, tagStrore, $$value => $$invalidate(12, $tagStrore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SideLeft", slots, []);
    	let allTags = [];
    	let pinTags = [];
    	let checkedIndex = $pagedd;
    	let countDate = 0;

    	onMount(() => {
    		countcount();
    		getPins();
    	});

    	function getTags() {
    		tags().then(async respone => {
    			let re = await respone.json();
    			let tempTags = re.body;
    			set_store_value(countStrore, $countStrore.tagCount = tempTags.length, $countStrore);
    			set_store_value(tagStrore, $tagStrore.allTags = tempTags, $tagStrore);

    			pinTags.forEach(item => {
    				let index = tempTags.indexOf(item.tag);

    				if (index != -1) {
    					tempTags.splice(index, 1);
    				}
    			});

    			$$invalidate(0, allTags = tempTags);
    		}).catch(reason => {
    			console.log(reason);
    		});
    	}

    	function getPins() {
    		pins().then(async respone => {
    			let re = await respone.json();
    			$$invalidate(1, pinTags = re.body);
    			getTags();
    		}).catch(reason => {
    			console.log(reason);
    		});
    	}

    	function pinNeno(tag, isPin) {
    		if (isPin) {
    			$$invalidate(1, pinTags = [...pinTags, { _id: "", tag }]);

    			$$invalidate(0, allTags = allTags.filter(item => {
    				return item != tag;
    			}));
    		} else {
    			$$invalidate(1, pinTags = pinTags.filter(item => {
    				return item.tag != tag;
    			}));

    			$$invalidate(0, allTags = [...allTags, tag]);
    		}

    		pin({ tag }).then(async respone => {
    			let re = await respone.json();
    		}).catch(reason => {
    			console.log(reason);
    		});
    	}

    	function countcount(params) {
    		count().then(async respone => {
    			let re = await respone.json();
    			set_store_value(countStrore, $countStrore.nenoCount = re.body.count, $countStrore);
    			delete re.body.countDate._id;
    			set_store_value(countStrore, $countStrore.countDate = re.body.countDate, $countStrore);
    			let dayCount = 0;

    			if (Object.keys($countStrore.countDate).length >= 1) {
    				dayCount = dayjs_min().diff(Object.keys($countStrore.countDate)[0], "day");
    			}

    			set_store_value(countStrore, $countStrore.dayCount = dayCount, $countStrore);
    		}).catch(reason => {
    			console.log(reason);
    		});
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<SideLeft> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		set_store_value(pagedd, $pagedd = "setting", $pagedd);
    		$$invalidate(2, checkedIndex = "setting");
    	};

    	const click_handler_1 = () => {
    		set_store_value(pagedd, $pagedd = "neno", $pagedd);
    		$$invalidate(2, checkedIndex = "neno");
    	};

    	const click_handler_2 = () => {
    		$$invalidate(2, checkedIndex = "daily");
    	};

    	const click_handler_3 = () => {
    		$$invalidate(2, checkedIndex = 2);
    	};

    	const click_handler_4 = tag => {
    		pinNeno(tag, false);
    	};

    	const click_handler_5 = tag => {
    		pinNeno(tag, true);
    	};

    	$$self.$capture_state = () => ({
    		tags,
    		pin,
    		pins,
    		count,
    		pagedd,
    		countStrore,
    		tagStrore,
    		GreenMap,
    		onMount,
    		dayjs: dayjs_min,
    		allTags,
    		pinTags,
    		checkedIndex,
    		countDate,
    		getTags,
    		getPins,
    		pinNeno,
    		countcount,
    		$pagedd,
    		$countStrore,
    		$tagStrore
    	});

    	$$self.$inject_state = $$props => {
    		if ("allTags" in $$props) $$invalidate(0, allTags = $$props.allTags);
    		if ("pinTags" in $$props) $$invalidate(1, pinTags = $$props.pinTags);
    		if ("checkedIndex" in $$props) $$invalidate(2, checkedIndex = $$props.checkedIndex);
    		if ("countDate" in $$props) countDate = $$props.countDate;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		allTags,
    		pinTags,
    		checkedIndex,
    		$pagedd,
    		$countStrore,
    		pinNeno,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class SideLeft extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SideLeft",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    var global$1 = (typeof global !== "undefined" ? global :
                typeof self !== "undefined" ? self :
                typeof window !== "undefined" ? window : {});

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    var inited = false;
    function init$1 () {
      inited = true;
      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }

      revLookup['-'.charCodeAt(0)] = 62;
      revLookup['_'.charCodeAt(0)] = 63;
    }

    function toByteArray (b64) {
      if (!inited) {
        init$1();
      }
      var i, j, l, tmp, placeHolders, arr;
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(len * 3 / 4 - placeHolders);

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len;

      var L = 0;

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
        arr[L++] = (tmp >> 16) & 0xFF;
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[L++] = tmp & 0xFF;
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      if (!inited) {
        init$1();
      }
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var output = '';
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        output += lookup[tmp >> 2];
        output += lookup[(tmp << 4) & 0x3F];
        output += '==';
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
        output += lookup[tmp >> 10];
        output += lookup[(tmp >> 4) & 0x3F];
        output += lookup[(tmp << 2) & 0x3F];
        output += '=';
      }

      parts.push(output);

      return parts.join('')
    }

    function read (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    function write (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    }

    var toString = {}.toString;

    var isArray = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    var INSPECT_MAX_BYTES = 50;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

    function kMaxLength () {
      return Buffer.TYPED_ARRAY_SUPPORT
        ? 0x7fffffff
        : 0x3fffffff
    }

    function createBuffer (that, length) {
      if (kMaxLength() < length) {
        throw new RangeError('Invalid typed array length')
      }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = new Uint8Array(length);
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        if (that === null) {
          that = new Buffer(length);
        }
        that.length = length;
      }

      return that
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
        return new Buffer(arg, encodingOrOffset, length)
      }

      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(this, arg)
      }
      return from(this, arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    // TODO: Legacy, not needed anymore. Remove in next major version.
    Buffer._augment = function (arr) {
      arr.__proto__ = Buffer.prototype;
      return arr
    };

    function from (that, value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
        return fromArrayBuffer(that, value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(that, value, encodingOrOffset)
      }

      return fromObject(that, value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(null, value, encodingOrOffset, length)
    };

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      Buffer.prototype.__proto__ = Uint8Array.prototype;
      Buffer.__proto__ = Uint8Array;
    }

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (that, size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(that, size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(that, size).fill(fill, encoding)
          : createBuffer(that, size).fill(fill)
      }
      return createBuffer(that, size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(null, size, fill, encoding)
    };

    function allocUnsafe (that, size) {
      assertSize(size);
      that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) {
        for (var i = 0; i < size; ++i) {
          that[i] = 0;
        }
      }
      return that
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(null, size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(null, size)
    };

    function fromString (that, string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0;
      that = createBuffer(that, length);

      var actual = that.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        that = that.slice(0, actual);
      }

      return that
    }

    function fromArrayLike (that, array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0;
      that = createBuffer(that, length);
      for (var i = 0; i < length; i += 1) {
        that[i] = array[i] & 255;
      }
      return that
    }

    function fromArrayBuffer (that, array, byteOffset, length) {
      array.byteLength; // this throws if `array` is not a valid ArrayBuffer

      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      if (byteOffset === undefined && length === undefined) {
        array = new Uint8Array(array);
      } else if (length === undefined) {
        array = new Uint8Array(array, byteOffset);
      } else {
        array = new Uint8Array(array, byteOffset, length);
      }

      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = array;
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        that = fromArrayLike(that, array);
      }
      return that
    }

    function fromObject (that, obj) {
      if (internalIsBuffer(obj)) {
        var len = checked(obj.length) | 0;
        that = createBuffer(that, len);

        if (that.length === 0) {
          return that
        }

        obj.copy(that, 0, 0, len);
        return that
      }

      if (obj) {
        if ((typeof ArrayBuffer !== 'undefined' &&
            obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
          if (typeof obj.length !== 'number' || isnan(obj.length)) {
            return createBuffer(that, 0)
          }
          return fromArrayLike(that, obj)
        }

        if (obj.type === 'Buffer' && isArray(obj.data)) {
          return fromArrayLike(that, obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < kMaxLength()` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= kMaxLength()) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + kMaxLength().toString(16) + ' bytes')
      }
      return length | 0
    }
    Buffer.isBuffer = isBuffer;
    function internalIsBuffer (b) {
      return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
      if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) return 0

      var x = a.length;
      var y = b.length;

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      var buffer = Buffer.allocUnsafe(length);
      var pos = 0;
      for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (!internalIsBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos);
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (internalIsBuffer(string)) {
        return string.length
      }
      if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
          (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string;
      }

      var len = string.length;
      if (len === 0) return 0

      // Use a for loop to avoid recursion
      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) return utf8ToBytes(string).length // assume utf8
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      var loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8';

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
    // Buffer instances.
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      var i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      var length = this.length | 0;
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.equals = function equals (b) {
      if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      var str = '';
      var max = INSPECT_MAX_BYTES;
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
        if (this.length > max) str += ' ... ';
      }
      return '<Buffer ' + str + '>'
    };

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!internalIsBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) return 0

      var x = thisEnd - thisStart;
      var y = end - start;
      var len = Math.min(x, y);

      var thisCopy = this.slice(thisStart, thisEnd);
      var targetCopy = target.slice(start, end);

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset;  // Coerce to Number.
      if (isNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (internalIsBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (Buffer.TYPED_ARRAY_SUPPORT &&
            typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1;
      var arrLength = arr.length;
      var valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i;
      if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          var found = true;
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (isNaN(parsed)) return i
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset | 0;
        if (isFinite(length)) {
          length = length | 0;
          if (encoding === undefined) encoding = 'utf8';
        } else {
          encoding = length;
          length = undefined;
        }
      // legacy write(string, encoding, offset, length) - remove in v0.13
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset;
      if (length === undefined || length > remaining) length = remaining;

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8';

      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return fromByteArray(buf)
      } else {
        return fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      var res = [];

      var i = start;
      while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
          : 1;

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = '';
      var i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      var out = '';
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = '';
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }

      if (end < start) end = start;

      var newBuf;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        newBuf = this.subarray(start, end);
        newBuf.__proto__ = Buffer.prototype;
      } else {
        var sliceLen = end - start;
        newBuf = new Buffer(sliceLen, undefined);
        for (var i = 0; i < sliceLen; ++i) {
          newBuf[i] = this[i + start];
        }
      }

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      var val = this[offset + --byteLength];
      var mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset]
    };

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var i = byteLength;
      var mul = 1;
      var val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var mul = 1;
      var i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var i = byteLength - 1;
      var mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      this[offset] = (value & 0xff);
      return offset + 1
    };

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
        buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
          (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffffffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
        buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
      }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset + 3] = (value >>> 24);
        this[offset + 2] = (value >>> 16);
        this[offset + 1] = (value >>> 8);
        this[offset] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = 0;
      var mul = 1;
      var sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = byteLength - 1;
      var mul = 1;
      var sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      if (value < 0) value = 0xff + value + 1;
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
        this[offset + 2] = (value >>> 16);
        this[offset + 3] = (value >>> 24);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (value < 0) value = 0xffffffff + value + 1;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      var len = end - start;
      var i;

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start];
        }
      } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start];
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0);
          if (code < 256) {
            val = code;
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) val = 0;

      var i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        var bytes = internalIsBuffer(val)
          ? val
          : utf8ToBytes(new Buffer(val, encoding).toString());
        var len = bytes.length;
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // HELPER FUNCTIONS
    // ================

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = stringtrim(str).replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function stringtrim (str) {
      if (str.trim) return str.trim()
      return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      var codePoint;
      var length = string.length;
      var leadSurrogate = null;
      var bytes = [];

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }


    function base64ToBytes (str) {
      return toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i];
      }
      return i
    }

    function isnan (val) {
      return val !== val // eslint-disable-line no-self-compare
    }


    // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
    // The _isBuffer check is for Safari 5-7 support, because it's missing
    // Object.prototype.constructor. Remove this eventually
    function isBuffer(obj) {
      return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    }

    function isFastBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

    // For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
    }

    var quill$1 = createCommonjsModule(function (module, exports) {
    /*!
     * Quill Editor v1.3.7
     * https://quilljs.com/
     * Copyright (c) 2014, Jason Chen
     * Copyright (c) 2013, salesforce.com
     */
    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(typeof self !== 'undefined' ? self : commonjsGlobal, function() {
    return /******/ (function(modules) { // webpackBootstrap
    /******/ 	// The module cache
    /******/ 	var installedModules = {};
    /******/
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/
    /******/ 		// Check if module is in cache
    /******/ 		if(installedModules[moduleId]) {
    /******/ 			return installedModules[moduleId].exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = installedModules[moduleId] = {
    /******/ 			i: moduleId,
    /******/ 			l: false,
    /******/ 			exports: {}
    /******/ 		};
    /******/
    /******/ 		// Execute the module function
    /******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    /******/
    /******/ 		// Flag the module as loaded
    /******/ 		module.l = true;
    /******/
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/
    /******/
    /******/ 	// expose the modules object (__webpack_modules__)
    /******/ 	__webpack_require__.m = modules;
    /******/
    /******/ 	// expose the module cache
    /******/ 	__webpack_require__.c = installedModules;
    /******/
    /******/ 	// define getter function for harmony exports
    /******/ 	__webpack_require__.d = function(exports, name, getter) {
    /******/ 		if(!__webpack_require__.o(exports, name)) {
    /******/ 			Object.defineProperty(exports, name, {
    /******/ 				configurable: false,
    /******/ 				enumerable: true,
    /******/ 				get: getter
    /******/ 			});
    /******/ 		}
    /******/ 	};
    /******/
    /******/ 	// getDefaultExport function for compatibility with non-harmony modules
    /******/ 	__webpack_require__.n = function(module) {
    /******/ 		var getter = module && module.__esModule ?
    /******/ 			function getDefault() { return module['default']; } :
    /******/ 			function getModuleExports() { return module; };
    /******/ 		__webpack_require__.d(getter, 'a', getter);
    /******/ 		return getter;
    /******/ 	};
    /******/
    /******/ 	// Object.prototype.hasOwnProperty.call
    /******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
    /******/
    /******/ 	// __webpack_public_path__
    /******/ 	__webpack_require__.p = "";
    /******/
    /******/ 	// Load entry module and return exports
    /******/ 	return __webpack_require__(__webpack_require__.s = 109);
    /******/ })
    /************************************************************************/
    /******/ ([
    /* 0 */
    /***/ (function(module, exports, __webpack_require__) {

    Object.defineProperty(exports, "__esModule", { value: true });
    var container_1 = __webpack_require__(17);
    var format_1 = __webpack_require__(18);
    var leaf_1 = __webpack_require__(19);
    var scroll_1 = __webpack_require__(45);
    var inline_1 = __webpack_require__(46);
    var block_1 = __webpack_require__(47);
    var embed_1 = __webpack_require__(48);
    var text_1 = __webpack_require__(49);
    var attributor_1 = __webpack_require__(12);
    var class_1 = __webpack_require__(32);
    var style_1 = __webpack_require__(33);
    var store_1 = __webpack_require__(31);
    var Registry = __webpack_require__(1);
    var Parchment = {
        Scope: Registry.Scope,
        create: Registry.create,
        find: Registry.find,
        query: Registry.query,
        register: Registry.register,
        Container: container_1.default,
        Format: format_1.default,
        Leaf: leaf_1.default,
        Embed: embed_1.default,
        Scroll: scroll_1.default,
        Block: block_1.default,
        Inline: inline_1.default,
        Text: text_1.default,
        Attributor: {
            Attribute: attributor_1.default,
            Class: class_1.default,
            Style: style_1.default,
            Store: store_1.default,
        },
    };
    exports.default = Parchment;


    /***/ }),
    /* 1 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var ParchmentError = /** @class */ (function (_super) {
        __extends(ParchmentError, _super);
        function ParchmentError(message) {
            var _this = this;
            message = '[Parchment] ' + message;
            _this = _super.call(this, message) || this;
            _this.message = message;
            _this.name = _this.constructor.name;
            return _this;
        }
        return ParchmentError;
    }(Error));
    exports.ParchmentError = ParchmentError;
    var attributes = {};
    var classes = {};
    var tags = {};
    var types = {};
    exports.DATA_KEY = '__blot';
    var Scope;
    (function (Scope) {
        Scope[Scope["TYPE"] = 3] = "TYPE";
        Scope[Scope["LEVEL"] = 12] = "LEVEL";
        Scope[Scope["ATTRIBUTE"] = 13] = "ATTRIBUTE";
        Scope[Scope["BLOT"] = 14] = "BLOT";
        Scope[Scope["INLINE"] = 7] = "INLINE";
        Scope[Scope["BLOCK"] = 11] = "BLOCK";
        Scope[Scope["BLOCK_BLOT"] = 10] = "BLOCK_BLOT";
        Scope[Scope["INLINE_BLOT"] = 6] = "INLINE_BLOT";
        Scope[Scope["BLOCK_ATTRIBUTE"] = 9] = "BLOCK_ATTRIBUTE";
        Scope[Scope["INLINE_ATTRIBUTE"] = 5] = "INLINE_ATTRIBUTE";
        Scope[Scope["ANY"] = 15] = "ANY";
    })(Scope = exports.Scope || (exports.Scope = {}));
    function create(input, value) {
        var match = query(input);
        if (match == null) {
            throw new ParchmentError("Unable to create " + input + " blot");
        }
        var BlotClass = match;
        var node = 
        // @ts-ignore
        input instanceof Node || input['nodeType'] === Node.TEXT_NODE ? input : BlotClass.create(value);
        return new BlotClass(node, value);
    }
    exports.create = create;
    function find(node, bubble) {
        if (bubble === void 0) { bubble = false; }
        if (node == null)
            return null;
        // @ts-ignore
        if (node[exports.DATA_KEY] != null)
            return node[exports.DATA_KEY].blot;
        if (bubble)
            return find(node.parentNode, bubble);
        return null;
    }
    exports.find = find;
    function query(query, scope) {
        if (scope === void 0) { scope = Scope.ANY; }
        var match;
        if (typeof query === 'string') {
            match = types[query] || attributes[query];
            // @ts-ignore
        }
        else if (query instanceof Text || query['nodeType'] === Node.TEXT_NODE) {
            match = types['text'];
        }
        else if (typeof query === 'number') {
            if (query & Scope.LEVEL & Scope.BLOCK) {
                match = types['block'];
            }
            else if (query & Scope.LEVEL & Scope.INLINE) {
                match = types['inline'];
            }
        }
        else if (query instanceof HTMLElement) {
            var names = (query.getAttribute('class') || '').split(/\s+/);
            for (var i in names) {
                match = classes[names[i]];
                if (match)
                    break;
            }
            match = match || tags[query.tagName];
        }
        if (match == null)
            return null;
        // @ts-ignore
        if (scope & Scope.LEVEL & match.scope && scope & Scope.TYPE & match.scope)
            return match;
        return null;
    }
    exports.query = query;
    function register() {
        var Definitions = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            Definitions[_i] = arguments[_i];
        }
        if (Definitions.length > 1) {
            return Definitions.map(function (d) {
                return register(d);
            });
        }
        var Definition = Definitions[0];
        if (typeof Definition.blotName !== 'string' && typeof Definition.attrName !== 'string') {
            throw new ParchmentError('Invalid definition');
        }
        else if (Definition.blotName === 'abstract') {
            throw new ParchmentError('Cannot register abstract class');
        }
        types[Definition.blotName || Definition.attrName] = Definition;
        if (typeof Definition.keyName === 'string') {
            attributes[Definition.keyName] = Definition;
        }
        else {
            if (Definition.className != null) {
                classes[Definition.className] = Definition;
            }
            if (Definition.tagName != null) {
                if (Array.isArray(Definition.tagName)) {
                    Definition.tagName = Definition.tagName.map(function (tagName) {
                        return tagName.toUpperCase();
                    });
                }
                else {
                    Definition.tagName = Definition.tagName.toUpperCase();
                }
                var tagNames = Array.isArray(Definition.tagName) ? Definition.tagName : [Definition.tagName];
                tagNames.forEach(function (tag) {
                    if (tags[tag] == null || Definition.className == null) {
                        tags[tag] = Definition;
                    }
                });
            }
        }
        return Definition;
    }
    exports.register = register;


    /***/ }),
    /* 2 */
    /***/ (function(module, exports, __webpack_require__) {

    var diff = __webpack_require__(51);
    var equal = __webpack_require__(11);
    var extend = __webpack_require__(3);
    var op = __webpack_require__(20);


    var NULL_CHARACTER = String.fromCharCode(0);  // Placeholder char for embed in diff()


    var Delta = function (ops) {
      // Assume we are given a well formed ops
      if (Array.isArray(ops)) {
        this.ops = ops;
      } else if (ops != null && Array.isArray(ops.ops)) {
        this.ops = ops.ops;
      } else {
        this.ops = [];
      }
    };


    Delta.prototype.insert = function (text, attributes) {
      var newOp = {};
      if (text.length === 0) return this;
      newOp.insert = text;
      if (attributes != null && typeof attributes === 'object' && Object.keys(attributes).length > 0) {
        newOp.attributes = attributes;
      }
      return this.push(newOp);
    };

    Delta.prototype['delete'] = function (length) {
      if (length <= 0) return this;
      return this.push({ 'delete': length });
    };

    Delta.prototype.retain = function (length, attributes) {
      if (length <= 0) return this;
      var newOp = { retain: length };
      if (attributes != null && typeof attributes === 'object' && Object.keys(attributes).length > 0) {
        newOp.attributes = attributes;
      }
      return this.push(newOp);
    };

    Delta.prototype.push = function (newOp) {
      var index = this.ops.length;
      var lastOp = this.ops[index - 1];
      newOp = extend(true, {}, newOp);
      if (typeof lastOp === 'object') {
        if (typeof newOp['delete'] === 'number' && typeof lastOp['delete'] === 'number') {
          this.ops[index - 1] = { 'delete': lastOp['delete'] + newOp['delete'] };
          return this;
        }
        // Since it does not matter if we insert before or after deleting at the same index,
        // always prefer to insert first
        if (typeof lastOp['delete'] === 'number' && newOp.insert != null) {
          index -= 1;
          lastOp = this.ops[index - 1];
          if (typeof lastOp !== 'object') {
            this.ops.unshift(newOp);
            return this;
          }
        }
        if (equal(newOp.attributes, lastOp.attributes)) {
          if (typeof newOp.insert === 'string' && typeof lastOp.insert === 'string') {
            this.ops[index - 1] = { insert: lastOp.insert + newOp.insert };
            if (typeof newOp.attributes === 'object') this.ops[index - 1].attributes = newOp.attributes;
            return this;
          } else if (typeof newOp.retain === 'number' && typeof lastOp.retain === 'number') {
            this.ops[index - 1] = { retain: lastOp.retain + newOp.retain };
            if (typeof newOp.attributes === 'object') this.ops[index - 1].attributes = newOp.attributes;
            return this;
          }
        }
      }
      if (index === this.ops.length) {
        this.ops.push(newOp);
      } else {
        this.ops.splice(index, 0, newOp);
      }
      return this;
    };

    Delta.prototype.chop = function () {
      var lastOp = this.ops[this.ops.length - 1];
      if (lastOp && lastOp.retain && !lastOp.attributes) {
        this.ops.pop();
      }
      return this;
    };

    Delta.prototype.filter = function (predicate) {
      return this.ops.filter(predicate);
    };

    Delta.prototype.forEach = function (predicate) {
      this.ops.forEach(predicate);
    };

    Delta.prototype.map = function (predicate) {
      return this.ops.map(predicate);
    };

    Delta.prototype.partition = function (predicate) {
      var passed = [], failed = [];
      this.forEach(function(op) {
        var target = predicate(op) ? passed : failed;
        target.push(op);
      });
      return [passed, failed];
    };

    Delta.prototype.reduce = function (predicate, initial) {
      return this.ops.reduce(predicate, initial);
    };

    Delta.prototype.changeLength = function () {
      return this.reduce(function (length, elem) {
        if (elem.insert) {
          return length + op.length(elem);
        } else if (elem.delete) {
          return length - elem.delete;
        }
        return length;
      }, 0);
    };

    Delta.prototype.length = function () {
      return this.reduce(function (length, elem) {
        return length + op.length(elem);
      }, 0);
    };

    Delta.prototype.slice = function (start, end) {
      start = start || 0;
      if (typeof end !== 'number') end = Infinity;
      var ops = [];
      var iter = op.iterator(this.ops);
      var index = 0;
      while (index < end && iter.hasNext()) {
        var nextOp;
        if (index < start) {
          nextOp = iter.next(start - index);
        } else {
          nextOp = iter.next(end - index);
          ops.push(nextOp);
        }
        index += op.length(nextOp);
      }
      return new Delta(ops);
    };


    Delta.prototype.compose = function (other) {
      var thisIter = op.iterator(this.ops);
      var otherIter = op.iterator(other.ops);
      var ops = [];
      var firstOther = otherIter.peek();
      if (firstOther != null && typeof firstOther.retain === 'number' && firstOther.attributes == null) {
        var firstLeft = firstOther.retain;
        while (thisIter.peekType() === 'insert' && thisIter.peekLength() <= firstLeft) {
          firstLeft -= thisIter.peekLength();
          ops.push(thisIter.next());
        }
        if (firstOther.retain - firstLeft > 0) {
          otherIter.next(firstOther.retain - firstLeft);
        }
      }
      var delta = new Delta(ops);
      while (thisIter.hasNext() || otherIter.hasNext()) {
        if (otherIter.peekType() === 'insert') {
          delta.push(otherIter.next());
        } else if (thisIter.peekType() === 'delete') {
          delta.push(thisIter.next());
        } else {
          var length = Math.min(thisIter.peekLength(), otherIter.peekLength());
          var thisOp = thisIter.next(length);
          var otherOp = otherIter.next(length);
          if (typeof otherOp.retain === 'number') {
            var newOp = {};
            if (typeof thisOp.retain === 'number') {
              newOp.retain = length;
            } else {
              newOp.insert = thisOp.insert;
            }
            // Preserve null when composing with a retain, otherwise remove it for inserts
            var attributes = op.attributes.compose(thisOp.attributes, otherOp.attributes, typeof thisOp.retain === 'number');
            if (attributes) newOp.attributes = attributes;
            delta.push(newOp);

            // Optimization if rest of other is just retain
            if (!otherIter.hasNext() && equal(delta.ops[delta.ops.length - 1], newOp)) {
              var rest = new Delta(thisIter.rest());
              return delta.concat(rest).chop();
            }

          // Other op should be delete, we could be an insert or retain
          // Insert + delete cancels out
          } else if (typeof otherOp['delete'] === 'number' && typeof thisOp.retain === 'number') {
            delta.push(otherOp);
          }
        }
      }
      return delta.chop();
    };

    Delta.prototype.concat = function (other) {
      var delta = new Delta(this.ops.slice());
      if (other.ops.length > 0) {
        delta.push(other.ops[0]);
        delta.ops = delta.ops.concat(other.ops.slice(1));
      }
      return delta;
    };

    Delta.prototype.diff = function (other, index) {
      if (this.ops === other.ops) {
        return new Delta();
      }
      var strings = [this, other].map(function (delta) {
        return delta.map(function (op) {
          if (op.insert != null) {
            return typeof op.insert === 'string' ? op.insert : NULL_CHARACTER;
          }
          var prep = (delta === other) ? 'on' : 'with';
          throw new Error('diff() called ' + prep + ' non-document');
        }).join('');
      });
      var delta = new Delta();
      var diffResult = diff(strings[0], strings[1], index);
      var thisIter = op.iterator(this.ops);
      var otherIter = op.iterator(other.ops);
      diffResult.forEach(function (component) {
        var length = component[1].length;
        while (length > 0) {
          var opLength = 0;
          switch (component[0]) {
            case diff.INSERT:
              opLength = Math.min(otherIter.peekLength(), length);
              delta.push(otherIter.next(opLength));
              break;
            case diff.DELETE:
              opLength = Math.min(length, thisIter.peekLength());
              thisIter.next(opLength);
              delta['delete'](opLength);
              break;
            case diff.EQUAL:
              opLength = Math.min(thisIter.peekLength(), otherIter.peekLength(), length);
              var thisOp = thisIter.next(opLength);
              var otherOp = otherIter.next(opLength);
              if (equal(thisOp.insert, otherOp.insert)) {
                delta.retain(opLength, op.attributes.diff(thisOp.attributes, otherOp.attributes));
              } else {
                delta.push(otherOp)['delete'](opLength);
              }
              break;
          }
          length -= opLength;
        }
      });
      return delta.chop();
    };

    Delta.prototype.eachLine = function (predicate, newline) {
      newline = newline || '\n';
      var iter = op.iterator(this.ops);
      var line = new Delta();
      var i = 0;
      while (iter.hasNext()) {
        if (iter.peekType() !== 'insert') return;
        var thisOp = iter.peek();
        var start = op.length(thisOp) - iter.peekLength();
        var index = typeof thisOp.insert === 'string' ?
          thisOp.insert.indexOf(newline, start) - start : -1;
        if (index < 0) {
          line.push(iter.next());
        } else if (index > 0) {
          line.push(iter.next(index));
        } else {
          if (predicate(line, iter.next(1).attributes || {}, i) === false) {
            return;
          }
          i += 1;
          line = new Delta();
        }
      }
      if (line.length() > 0) {
        predicate(line, {}, i);
      }
    };

    Delta.prototype.transform = function (other, priority) {
      priority = !!priority;
      if (typeof other === 'number') {
        return this.transformPosition(other, priority);
      }
      var thisIter = op.iterator(this.ops);
      var otherIter = op.iterator(other.ops);
      var delta = new Delta();
      while (thisIter.hasNext() || otherIter.hasNext()) {
        if (thisIter.peekType() === 'insert' && (priority || otherIter.peekType() !== 'insert')) {
          delta.retain(op.length(thisIter.next()));
        } else if (otherIter.peekType() === 'insert') {
          delta.push(otherIter.next());
        } else {
          var length = Math.min(thisIter.peekLength(), otherIter.peekLength());
          var thisOp = thisIter.next(length);
          var otherOp = otherIter.next(length);
          if (thisOp['delete']) {
            // Our delete either makes their delete redundant or removes their retain
            continue;
          } else if (otherOp['delete']) {
            delta.push(otherOp);
          } else {
            // We retain either their retain or insert
            delta.retain(length, op.attributes.transform(thisOp.attributes, otherOp.attributes, priority));
          }
        }
      }
      return delta.chop();
    };

    Delta.prototype.transformPosition = function (index, priority) {
      priority = !!priority;
      var thisIter = op.iterator(this.ops);
      var offset = 0;
      while (thisIter.hasNext() && offset <= index) {
        var length = thisIter.peekLength();
        var nextType = thisIter.peekType();
        thisIter.next();
        if (nextType === 'delete') {
          index -= Math.min(length, index - offset);
          continue;
        } else if (nextType === 'insert' && (offset < index || !priority)) {
          index += length;
        }
        offset += length;
      }
      return index;
    };


    module.exports = Delta;


    /***/ }),
    /* 3 */
    /***/ (function(module, exports) {

    var hasOwn = Object.prototype.hasOwnProperty;
    var toStr = Object.prototype.toString;
    var defineProperty = Object.defineProperty;
    var gOPD = Object.getOwnPropertyDescriptor;

    var isArray = function isArray(arr) {
    	if (typeof Array.isArray === 'function') {
    		return Array.isArray(arr);
    	}

    	return toStr.call(arr) === '[object Array]';
    };

    var isPlainObject = function isPlainObject(obj) {
    	if (!obj || toStr.call(obj) !== '[object Object]') {
    		return false;
    	}

    	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
    	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
    	// Not own constructor property must be Object
    	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
    		return false;
    	}

    	// Own properties are enumerated firstly, so to speed up,
    	// if last one is own, then all properties are own.
    	var key;
    	for (key in obj) { /**/ }

    	return typeof key === 'undefined' || hasOwn.call(obj, key);
    };

    // If name is '__proto__', and Object.defineProperty is available, define __proto__ as an own property on target
    var setProperty = function setProperty(target, options) {
    	if (defineProperty && options.name === '__proto__') {
    		defineProperty(target, options.name, {
    			enumerable: true,
    			configurable: true,
    			value: options.newValue,
    			writable: true
    		});
    	} else {
    		target[options.name] = options.newValue;
    	}
    };

    // Return undefined instead of __proto__ if '__proto__' is not an own property
    var getProperty = function getProperty(obj, name) {
    	if (name === '__proto__') {
    		if (!hasOwn.call(obj, name)) {
    			return void 0;
    		} else if (gOPD) {
    			// In early versions of node, obj['__proto__'] is buggy when obj has
    			// __proto__ as an own property. Object.getOwnPropertyDescriptor() works.
    			return gOPD(obj, name).value;
    		}
    	}

    	return obj[name];
    };

    module.exports = function extend() {
    	var options, name, src, copy, copyIsArray, clone;
    	var target = arguments[0];
    	var i = 1;
    	var length = arguments.length;
    	var deep = false;

    	// Handle a deep copy situation
    	if (typeof target === 'boolean') {
    		deep = target;
    		target = arguments[1] || {};
    		// skip the boolean and the target
    		i = 2;
    	}
    	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
    		target = {};
    	}

    	for (; i < length; ++i) {
    		options = arguments[i];
    		// Only deal with non-null/undefined values
    		if (options != null) {
    			// Extend the base object
    			for (name in options) {
    				src = getProperty(target, name);
    				copy = getProperty(options, name);

    				// Prevent never-ending loop
    				if (target !== copy) {
    					// Recurse if we're merging plain objects or arrays
    					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
    						if (copyIsArray) {
    							copyIsArray = false;
    							clone = src && isArray(src) ? src : [];
    						} else {
    							clone = src && isPlainObject(src) ? src : {};
    						}

    						// Never move original objects, clone them
    						setProperty(target, { name: name, newValue: extend(deep, clone, copy) });

    					// Don't bring in undefined values
    					} else if (typeof copy !== 'undefined') {
    						setProperty(target, { name: name, newValue: copy });
    					}
    				}
    			}
    		}
    	}

    	// Return the modified object
    	return target;
    };


    /***/ }),
    /* 4 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.BlockEmbed = exports.bubbleFormats = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _break = __webpack_require__(16);

    var _break2 = _interopRequireDefault(_break);

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    var _text = __webpack_require__(7);

    var _text2 = _interopRequireDefault(_text);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var NEWLINE_LENGTH = 1;

    var BlockEmbed = function (_Parchment$Embed) {
      _inherits(BlockEmbed, _Parchment$Embed);

      function BlockEmbed() {
        _classCallCheck(this, BlockEmbed);

        return _possibleConstructorReturn(this, (BlockEmbed.__proto__ || Object.getPrototypeOf(BlockEmbed)).apply(this, arguments));
      }

      _createClass(BlockEmbed, [{
        key: 'attach',
        value: function attach() {
          _get(BlockEmbed.prototype.__proto__ || Object.getPrototypeOf(BlockEmbed.prototype), 'attach', this).call(this);
          this.attributes = new _parchment2.default.Attributor.Store(this.domNode);
        }
      }, {
        key: 'delta',
        value: function delta() {
          return new _quillDelta2.default().insert(this.value(), (0, _extend2.default)(this.formats(), this.attributes.values()));
        }
      }, {
        key: 'format',
        value: function format(name, value) {
          var attribute = _parchment2.default.query(name, _parchment2.default.Scope.BLOCK_ATTRIBUTE);
          if (attribute != null) {
            this.attributes.attribute(attribute, value);
          }
        }
      }, {
        key: 'formatAt',
        value: function formatAt(index, length, name, value) {
          this.format(name, value);
        }
      }, {
        key: 'insertAt',
        value: function insertAt(index, value, def) {
          if (typeof value === 'string' && value.endsWith('\n')) {
            var block = _parchment2.default.create(Block.blotName);
            this.parent.insertBefore(block, index === 0 ? this : this.next);
            block.insertAt(0, value.slice(0, -1));
          } else {
            _get(BlockEmbed.prototype.__proto__ || Object.getPrototypeOf(BlockEmbed.prototype), 'insertAt', this).call(this, index, value, def);
          }
        }
      }]);

      return BlockEmbed;
    }(_parchment2.default.Embed);

    BlockEmbed.scope = _parchment2.default.Scope.BLOCK_BLOT;
    // It is important for cursor behavior BlockEmbeds use tags that are block level elements


    var Block = function (_Parchment$Block) {
      _inherits(Block, _Parchment$Block);

      function Block(domNode) {
        _classCallCheck(this, Block);

        var _this2 = _possibleConstructorReturn(this, (Block.__proto__ || Object.getPrototypeOf(Block)).call(this, domNode));

        _this2.cache = {};
        return _this2;
      }

      _createClass(Block, [{
        key: 'delta',
        value: function delta() {
          if (this.cache.delta == null) {
            this.cache.delta = this.descendants(_parchment2.default.Leaf).reduce(function (delta, leaf) {
              if (leaf.length() === 0) {
                return delta;
              } else {
                return delta.insert(leaf.value(), bubbleFormats(leaf));
              }
            }, new _quillDelta2.default()).insert('\n', bubbleFormats(this));
          }
          return this.cache.delta;
        }
      }, {
        key: 'deleteAt',
        value: function deleteAt(index, length) {
          _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'deleteAt', this).call(this, index, length);
          this.cache = {};
        }
      }, {
        key: 'formatAt',
        value: function formatAt(index, length, name, value) {
          if (length <= 0) return;
          if (_parchment2.default.query(name, _parchment2.default.Scope.BLOCK)) {
            if (index + length === this.length()) {
              this.format(name, value);
            }
          } else {
            _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'formatAt', this).call(this, index, Math.min(length, this.length() - index - 1), name, value);
          }
          this.cache = {};
        }
      }, {
        key: 'insertAt',
        value: function insertAt(index, value, def) {
          if (def != null) return _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'insertAt', this).call(this, index, value, def);
          if (value.length === 0) return;
          var lines = value.split('\n');
          var text = lines.shift();
          if (text.length > 0) {
            if (index < this.length() - 1 || this.children.tail == null) {
              _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'insertAt', this).call(this, Math.min(index, this.length() - 1), text);
            } else {
              this.children.tail.insertAt(this.children.tail.length(), text);
            }
            this.cache = {};
          }
          var block = this;
          lines.reduce(function (index, line) {
            block = block.split(index, true);
            block.insertAt(0, line);
            return line.length;
          }, index + text.length);
        }
      }, {
        key: 'insertBefore',
        value: function insertBefore(blot, ref) {
          var head = this.children.head;
          _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'insertBefore', this).call(this, blot, ref);
          if (head instanceof _break2.default) {
            head.remove();
          }
          this.cache = {};
        }
      }, {
        key: 'length',
        value: function length() {
          if (this.cache.length == null) {
            this.cache.length = _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'length', this).call(this) + NEWLINE_LENGTH;
          }
          return this.cache.length;
        }
      }, {
        key: 'moveChildren',
        value: function moveChildren(target, ref) {
          _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'moveChildren', this).call(this, target, ref);
          this.cache = {};
        }
      }, {
        key: 'optimize',
        value: function optimize(context) {
          _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'optimize', this).call(this, context);
          this.cache = {};
        }
      }, {
        key: 'path',
        value: function path(index) {
          return _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'path', this).call(this, index, true);
        }
      }, {
        key: 'removeChild',
        value: function removeChild(child) {
          _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'removeChild', this).call(this, child);
          this.cache = {};
        }
      }, {
        key: 'split',
        value: function split(index) {
          var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

          if (force && (index === 0 || index >= this.length() - NEWLINE_LENGTH)) {
            var clone = this.clone();
            if (index === 0) {
              this.parent.insertBefore(clone, this);
              return this;
            } else {
              this.parent.insertBefore(clone, this.next);
              return clone;
            }
          } else {
            var next = _get(Block.prototype.__proto__ || Object.getPrototypeOf(Block.prototype), 'split', this).call(this, index, force);
            this.cache = {};
            return next;
          }
        }
      }]);

      return Block;
    }(_parchment2.default.Block);

    Block.blotName = 'block';
    Block.tagName = 'P';
    Block.defaultChild = 'break';
    Block.allowedChildren = [_inline2.default, _parchment2.default.Embed, _text2.default];

    function bubbleFormats(blot) {
      var formats = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      if (blot == null) return formats;
      if (typeof blot.formats === 'function') {
        formats = (0, _extend2.default)(formats, blot.formats());
      }
      if (blot.parent == null || blot.parent.blotName == 'scroll' || blot.parent.statics.scope !== blot.statics.scope) {
        return formats;
      }
      return bubbleFormats(blot.parent, formats);
    }

    exports.bubbleFormats = bubbleFormats;
    exports.BlockEmbed = BlockEmbed;
    exports.default = Block;

    /***/ }),
    /* 5 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.overload = exports.expandConfig = undefined;

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    __webpack_require__(50);

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _editor = __webpack_require__(14);

    var _editor2 = _interopRequireDefault(_editor);

    var _emitter3 = __webpack_require__(8);

    var _emitter4 = _interopRequireDefault(_emitter3);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _selection = __webpack_require__(15);

    var _selection2 = _interopRequireDefault(_selection);

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    var _logger = __webpack_require__(10);

    var _logger2 = _interopRequireDefault(_logger);

    var _theme = __webpack_require__(34);

    var _theme2 = _interopRequireDefault(_theme);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var debug = (0, _logger2.default)('quill');

    var Quill = function () {
      _createClass(Quill, null, [{
        key: 'debug',
        value: function debug(limit) {
          if (limit === true) {
            limit = 'log';
          }
          _logger2.default.level(limit);
        }
      }, {
        key: 'find',
        value: function find(node) {
          return node.__quill || _parchment2.default.find(node);
        }
      }, {
        key: 'import',
        value: function _import(name) {
          if (this.imports[name] == null) {
            debug.error('Cannot import ' + name + '. Are you sure it was registered?');
          }
          return this.imports[name];
        }
      }, {
        key: 'register',
        value: function register(path, target) {
          var _this = this;

          var overwrite = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

          if (typeof path !== 'string') {
            var name = path.attrName || path.blotName;
            if (typeof name === 'string') {
              // register(Blot | Attributor, overwrite)
              this.register('formats/' + name, path, target);
            } else {
              Object.keys(path).forEach(function (key) {
                _this.register(key, path[key], target);
              });
            }
          } else {
            if (this.imports[path] != null && !overwrite) {
              debug.warn('Overwriting ' + path + ' with', target);
            }
            this.imports[path] = target;
            if ((path.startsWith('blots/') || path.startsWith('formats/')) && target.blotName !== 'abstract') {
              _parchment2.default.register(target);
            } else if (path.startsWith('modules') && typeof target.register === 'function') {
              target.register();
            }
          }
        }
      }]);

      function Quill(container) {
        var _this2 = this;

        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Quill);

        this.options = expandConfig(container, options);
        this.container = this.options.container;
        if (this.container == null) {
          return debug.error('Invalid Quill container', container);
        }
        if (this.options.debug) {
          Quill.debug(this.options.debug);
        }
        var html = this.container.innerHTML.trim();
        this.container.classList.add('ql-container');
        this.container.innerHTML = '';
        this.container.__quill = this;
        this.root = this.addContainer('ql-editor');
        this.root.classList.add('ql-blank');
        this.root.setAttribute('data-gramm', false);
        this.scrollingContainer = this.options.scrollingContainer || this.root;
        this.emitter = new _emitter4.default();
        this.scroll = _parchment2.default.create(this.root, {
          emitter: this.emitter,
          whitelist: this.options.formats
        });
        this.editor = new _editor2.default(this.scroll);
        this.selection = new _selection2.default(this.scroll, this.emitter);
        this.theme = new this.options.theme(this, this.options);
        this.keyboard = this.theme.addModule('keyboard');
        this.clipboard = this.theme.addModule('clipboard');
        this.history = this.theme.addModule('history');
        this.theme.init();
        this.emitter.on(_emitter4.default.events.EDITOR_CHANGE, function (type) {
          if (type === _emitter4.default.events.TEXT_CHANGE) {
            _this2.root.classList.toggle('ql-blank', _this2.editor.isBlank());
          }
        });
        this.emitter.on(_emitter4.default.events.SCROLL_UPDATE, function (source, mutations) {
          var range = _this2.selection.lastRange;
          var index = range && range.length === 0 ? range.index : undefined;
          modify.call(_this2, function () {
            return _this2.editor.update(null, mutations, index);
          }, source);
        });
        var contents = this.clipboard.convert('<div class=\'ql-editor\' style="white-space: normal;">' + html + '<p><br></p></div>');
        this.setContents(contents);
        this.history.clear();
        if (this.options.placeholder) {
          this.root.setAttribute('data-placeholder', this.options.placeholder);
        }
        if (this.options.readOnly) {
          this.disable();
        }
      }

      _createClass(Quill, [{
        key: 'addContainer',
        value: function addContainer(container) {
          var refNode = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

          if (typeof container === 'string') {
            var className = container;
            container = document.createElement('div');
            container.classList.add(className);
          }
          this.container.insertBefore(container, refNode);
          return container;
        }
      }, {
        key: 'blur',
        value: function blur() {
          this.selection.setRange(null);
        }
      }, {
        key: 'deleteText',
        value: function deleteText(index, length, source) {
          var _this3 = this;

          var _overload = overload(index, length, source);

          var _overload2 = _slicedToArray(_overload, 4);

          index = _overload2[0];
          length = _overload2[1];
          source = _overload2[3];

          return modify.call(this, function () {
            return _this3.editor.deleteText(index, length);
          }, source, index, -1 * length);
        }
      }, {
        key: 'disable',
        value: function disable() {
          this.enable(false);
        }
      }, {
        key: 'enable',
        value: function enable() {
          var enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

          this.scroll.enable(enabled);
          this.container.classList.toggle('ql-disabled', !enabled);
        }
      }, {
        key: 'focus',
        value: function focus() {
          var scrollTop = this.scrollingContainer.scrollTop;
          this.selection.focus();
          this.scrollingContainer.scrollTop = scrollTop;
          this.scrollIntoView();
        }
      }, {
        key: 'format',
        value: function format(name, value) {
          var _this4 = this;

          var source = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _emitter4.default.sources.API;

          return modify.call(this, function () {
            var range = _this4.getSelection(true);
            var change = new _quillDelta2.default();
            if (range == null) {
              return change;
            } else if (_parchment2.default.query(name, _parchment2.default.Scope.BLOCK)) {
              change = _this4.editor.formatLine(range.index, range.length, _defineProperty({}, name, value));
            } else if (range.length === 0) {
              _this4.selection.format(name, value);
              return change;
            } else {
              change = _this4.editor.formatText(range.index, range.length, _defineProperty({}, name, value));
            }
            _this4.setSelection(range, _emitter4.default.sources.SILENT);
            return change;
          }, source);
        }
      }, {
        key: 'formatLine',
        value: function formatLine(index, length, name, value, source) {
          var _this5 = this;

          var formats = void 0;

          var _overload3 = overload(index, length, name, value, source);

          var _overload4 = _slicedToArray(_overload3, 4);

          index = _overload4[0];
          length = _overload4[1];
          formats = _overload4[2];
          source = _overload4[3];

          return modify.call(this, function () {
            return _this5.editor.formatLine(index, length, formats);
          }, source, index, 0);
        }
      }, {
        key: 'formatText',
        value: function formatText(index, length, name, value, source) {
          var _this6 = this;

          var formats = void 0;

          var _overload5 = overload(index, length, name, value, source);

          var _overload6 = _slicedToArray(_overload5, 4);

          index = _overload6[0];
          length = _overload6[1];
          formats = _overload6[2];
          source = _overload6[3];

          return modify.call(this, function () {
            return _this6.editor.formatText(index, length, formats);
          }, source, index, 0);
        }
      }, {
        key: 'getBounds',
        value: function getBounds(index) {
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

          var bounds = void 0;
          if (typeof index === 'number') {
            bounds = this.selection.getBounds(index, length);
          } else {
            bounds = this.selection.getBounds(index.index, index.length);
          }
          var containerBounds = this.container.getBoundingClientRect();
          return {
            bottom: bounds.bottom - containerBounds.top,
            height: bounds.height,
            left: bounds.left - containerBounds.left,
            right: bounds.right - containerBounds.left,
            top: bounds.top - containerBounds.top,
            width: bounds.width
          };
        }
      }, {
        key: 'getContents',
        value: function getContents() {
          var index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.getLength() - index;

          var _overload7 = overload(index, length);

          var _overload8 = _slicedToArray(_overload7, 2);

          index = _overload8[0];
          length = _overload8[1];

          return this.editor.getContents(index, length);
        }
      }, {
        key: 'getFormat',
        value: function getFormat() {
          var index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.getSelection(true);
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

          if (typeof index === 'number') {
            return this.editor.getFormat(index, length);
          } else {
            return this.editor.getFormat(index.index, index.length);
          }
        }
      }, {
        key: 'getIndex',
        value: function getIndex(blot) {
          return blot.offset(this.scroll);
        }
      }, {
        key: 'getLength',
        value: function getLength() {
          return this.scroll.length();
        }
      }, {
        key: 'getLeaf',
        value: function getLeaf(index) {
          return this.scroll.leaf(index);
        }
      }, {
        key: 'getLine',
        value: function getLine(index) {
          return this.scroll.line(index);
        }
      }, {
        key: 'getLines',
        value: function getLines() {
          var index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Number.MAX_VALUE;

          if (typeof index !== 'number') {
            return this.scroll.lines(index.index, index.length);
          } else {
            return this.scroll.lines(index, length);
          }
        }
      }, {
        key: 'getModule',
        value: function getModule(name) {
          return this.theme.modules[name];
        }
      }, {
        key: 'getSelection',
        value: function getSelection() {
          var focus = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

          if (focus) this.focus();
          this.update(); // Make sure we access getRange with editor in consistent state
          return this.selection.getRange()[0];
        }
      }, {
        key: 'getText',
        value: function getText() {
          var index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.getLength() - index;

          var _overload9 = overload(index, length);

          var _overload10 = _slicedToArray(_overload9, 2);

          index = _overload10[0];
          length = _overload10[1];

          return this.editor.getText(index, length);
        }
      }, {
        key: 'hasFocus',
        value: function hasFocus() {
          return this.selection.hasFocus();
        }
      }, {
        key: 'insertEmbed',
        value: function insertEmbed(index, embed, value) {
          var _this7 = this;

          var source = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : Quill.sources.API;

          return modify.call(this, function () {
            return _this7.editor.insertEmbed(index, embed, value);
          }, source, index);
        }
      }, {
        key: 'insertText',
        value: function insertText(index, text, name, value, source) {
          var _this8 = this;

          var formats = void 0;

          var _overload11 = overload(index, 0, name, value, source);

          var _overload12 = _slicedToArray(_overload11, 4);

          index = _overload12[0];
          formats = _overload12[2];
          source = _overload12[3];

          return modify.call(this, function () {
            return _this8.editor.insertText(index, text, formats);
          }, source, index, text.length);
        }
      }, {
        key: 'isEnabled',
        value: function isEnabled() {
          return !this.container.classList.contains('ql-disabled');
        }
      }, {
        key: 'off',
        value: function off() {
          return this.emitter.off.apply(this.emitter, arguments);
        }
      }, {
        key: 'on',
        value: function on() {
          return this.emitter.on.apply(this.emitter, arguments);
        }
      }, {
        key: 'once',
        value: function once() {
          return this.emitter.once.apply(this.emitter, arguments);
        }
      }, {
        key: 'pasteHTML',
        value: function pasteHTML(index, html, source) {
          this.clipboard.dangerouslyPasteHTML(index, html, source);
        }
      }, {
        key: 'removeFormat',
        value: function removeFormat(index, length, source) {
          var _this9 = this;

          var _overload13 = overload(index, length, source);

          var _overload14 = _slicedToArray(_overload13, 4);

          index = _overload14[0];
          length = _overload14[1];
          source = _overload14[3];

          return modify.call(this, function () {
            return _this9.editor.removeFormat(index, length);
          }, source, index);
        }
      }, {
        key: 'scrollIntoView',
        value: function scrollIntoView() {
          this.selection.scrollIntoView(this.scrollingContainer);
        }
      }, {
        key: 'setContents',
        value: function setContents(delta) {
          var _this10 = this;

          var source = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _emitter4.default.sources.API;

          return modify.call(this, function () {
            delta = new _quillDelta2.default(delta);
            var length = _this10.getLength();
            var deleted = _this10.editor.deleteText(0, length);
            var applied = _this10.editor.applyDelta(delta);
            var lastOp = applied.ops[applied.ops.length - 1];
            if (lastOp != null && typeof lastOp.insert === 'string' && lastOp.insert[lastOp.insert.length - 1] === '\n') {
              _this10.editor.deleteText(_this10.getLength() - 1, 1);
              applied.delete(1);
            }
            var ret = deleted.compose(applied);
            return ret;
          }, source);
        }
      }, {
        key: 'setSelection',
        value: function setSelection(index, length, source) {
          if (index == null) {
            this.selection.setRange(null, length || Quill.sources.API);
          } else {
            var _overload15 = overload(index, length, source);

            var _overload16 = _slicedToArray(_overload15, 4);

            index = _overload16[0];
            length = _overload16[1];
            source = _overload16[3];

            this.selection.setRange(new _selection.Range(index, length), source);
            if (source !== _emitter4.default.sources.SILENT) {
              this.selection.scrollIntoView(this.scrollingContainer);
            }
          }
        }
      }, {
        key: 'setText',
        value: function setText(text) {
          var source = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _emitter4.default.sources.API;

          var delta = new _quillDelta2.default().insert(text);
          return this.setContents(delta, source);
        }
      }, {
        key: 'update',
        value: function update() {
          var source = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _emitter4.default.sources.USER;

          var change = this.scroll.update(source); // Will update selection before selection.update() does if text changes
          this.selection.update(source);
          return change;
        }
      }, {
        key: 'updateContents',
        value: function updateContents(delta) {
          var _this11 = this;

          var source = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _emitter4.default.sources.API;

          return modify.call(this, function () {
            delta = new _quillDelta2.default(delta);
            return _this11.editor.applyDelta(delta, source);
          }, source, true);
        }
      }]);

      return Quill;
    }();

    Quill.DEFAULTS = {
      bounds: null,
      formats: null,
      modules: {},
      placeholder: '',
      readOnly: false,
      scrollingContainer: null,
      strict: true,
      theme: 'default'
    };
    Quill.events = _emitter4.default.events;
    Quill.sources = _emitter4.default.sources;
    // eslint-disable-next-line no-undef
    Quill.version =   "1.3.7";

    Quill.imports = {
      'delta': _quillDelta2.default,
      'parchment': _parchment2.default,
      'core/module': _module2.default,
      'core/theme': _theme2.default
    };

    function expandConfig(container, userConfig) {
      userConfig = (0, _extend2.default)(true, {
        container: container,
        modules: {
          clipboard: true,
          keyboard: true,
          history: true
        }
      }, userConfig);
      if (!userConfig.theme || userConfig.theme === Quill.DEFAULTS.theme) {
        userConfig.theme = _theme2.default;
      } else {
        userConfig.theme = Quill.import('themes/' + userConfig.theme);
        if (userConfig.theme == null) {
          throw new Error('Invalid theme ' + userConfig.theme + '. Did you register it?');
        }
      }
      var themeConfig = (0, _extend2.default)(true, {}, userConfig.theme.DEFAULTS);
      [themeConfig, userConfig].forEach(function (config) {
        config.modules = config.modules || {};
        Object.keys(config.modules).forEach(function (module) {
          if (config.modules[module] === true) {
            config.modules[module] = {};
          }
        });
      });
      var moduleNames = Object.keys(themeConfig.modules).concat(Object.keys(userConfig.modules));
      var moduleConfig = moduleNames.reduce(function (config, name) {
        var moduleClass = Quill.import('modules/' + name);
        if (moduleClass == null) {
          debug.error('Cannot load ' + name + ' module. Are you sure you registered it?');
        } else {
          config[name] = moduleClass.DEFAULTS || {};
        }
        return config;
      }, {});
      // Special case toolbar shorthand
      if (userConfig.modules != null && userConfig.modules.toolbar && userConfig.modules.toolbar.constructor !== Object) {
        userConfig.modules.toolbar = {
          container: userConfig.modules.toolbar
        };
      }
      userConfig = (0, _extend2.default)(true, {}, Quill.DEFAULTS, { modules: moduleConfig }, themeConfig, userConfig);
      ['bounds', 'container', 'scrollingContainer'].forEach(function (key) {
        if (typeof userConfig[key] === 'string') {
          userConfig[key] = document.querySelector(userConfig[key]);
        }
      });
      userConfig.modules = Object.keys(userConfig.modules).reduce(function (config, name) {
        if (userConfig.modules[name]) {
          config[name] = userConfig.modules[name];
        }
        return config;
      }, {});
      return userConfig;
    }

    // Handle selection preservation and TEXT_CHANGE emission
    // common to modification APIs
    function modify(modifier, source, index, shift) {
      if (this.options.strict && !this.isEnabled() && source === _emitter4.default.sources.USER) {
        return new _quillDelta2.default();
      }
      var range = index == null ? null : this.getSelection();
      var oldDelta = this.editor.delta;
      var change = modifier();
      if (range != null) {
        if (index === true) index = range.index;
        if (shift == null) {
          range = shiftRange(range, change, source);
        } else if (shift !== 0) {
          range = shiftRange(range, index, shift, source);
        }
        this.setSelection(range, _emitter4.default.sources.SILENT);
      }
      if (change.length() > 0) {
        var _emitter;

        var args = [_emitter4.default.events.TEXT_CHANGE, change, oldDelta, source];
        (_emitter = this.emitter).emit.apply(_emitter, [_emitter4.default.events.EDITOR_CHANGE].concat(args));
        if (source !== _emitter4.default.sources.SILENT) {
          var _emitter2;

          (_emitter2 = this.emitter).emit.apply(_emitter2, args);
        }
      }
      return change;
    }

    function overload(index, length, name, value, source) {
      var formats = {};
      if (typeof index.index === 'number' && typeof index.length === 'number') {
        // Allow for throwaway end (used by insertText/insertEmbed)
        if (typeof length !== 'number') {
          source = value, value = name, name = length, length = index.length, index = index.index;
        } else {
          length = index.length, index = index.index;
        }
      } else if (typeof length !== 'number') {
        source = value, value = name, name = length, length = 0;
      }
      // Handle format being object, two format name/value strings or excluded
      if ((typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
        formats = name;
        source = value;
      } else if (typeof name === 'string') {
        if (value != null) {
          formats[name] = value;
        } else {
          source = name;
        }
      }
      // Handle optional source
      source = source || _emitter4.default.sources.API;
      return [index, length, formats, source];
    }

    function shiftRange(range, index, length, source) {
      if (range == null) return null;
      var start = void 0,
          end = void 0;
      if (index instanceof _quillDelta2.default) {
        var _map = [range.index, range.index + range.length].map(function (pos) {
          return index.transformPosition(pos, source !== _emitter4.default.sources.USER);
        });

        var _map2 = _slicedToArray(_map, 2);

        start = _map2[0];
        end = _map2[1];
      } else {
        var _map3 = [range.index, range.index + range.length].map(function (pos) {
          if (pos < index || pos === index && source === _emitter4.default.sources.USER) return pos;
          if (length >= 0) {
            return pos + length;
          } else {
            return Math.max(index, pos + length);
          }
        });

        var _map4 = _slicedToArray(_map3, 2);

        start = _map4[0];
        end = _map4[1];
      }
      return new _selection.Range(start, end - start);
    }

    exports.expandConfig = expandConfig;
    exports.overload = overload;
    exports.default = Quill;

    /***/ }),
    /* 6 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _text = __webpack_require__(7);

    var _text2 = _interopRequireDefault(_text);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Inline = function (_Parchment$Inline) {
      _inherits(Inline, _Parchment$Inline);

      function Inline() {
        _classCallCheck(this, Inline);

        return _possibleConstructorReturn(this, (Inline.__proto__ || Object.getPrototypeOf(Inline)).apply(this, arguments));
      }

      _createClass(Inline, [{
        key: 'formatAt',
        value: function formatAt(index, length, name, value) {
          if (Inline.compare(this.statics.blotName, name) < 0 && _parchment2.default.query(name, _parchment2.default.Scope.BLOT)) {
            var blot = this.isolate(index, length);
            if (value) {
              blot.wrap(name, value);
            }
          } else {
            _get(Inline.prototype.__proto__ || Object.getPrototypeOf(Inline.prototype), 'formatAt', this).call(this, index, length, name, value);
          }
        }
      }, {
        key: 'optimize',
        value: function optimize(context) {
          _get(Inline.prototype.__proto__ || Object.getPrototypeOf(Inline.prototype), 'optimize', this).call(this, context);
          if (this.parent instanceof Inline && Inline.compare(this.statics.blotName, this.parent.statics.blotName) > 0) {
            var parent = this.parent.isolate(this.offset(), this.length());
            this.moveChildren(parent);
            parent.wrap(this);
          }
        }
      }], [{
        key: 'compare',
        value: function compare(self, other) {
          var selfIndex = Inline.order.indexOf(self);
          var otherIndex = Inline.order.indexOf(other);
          if (selfIndex >= 0 || otherIndex >= 0) {
            return selfIndex - otherIndex;
          } else if (self === other) {
            return 0;
          } else if (self < other) {
            return -1;
          } else {
            return 1;
          }
        }
      }]);

      return Inline;
    }(_parchment2.default.Inline);

    Inline.allowedChildren = [Inline, _parchment2.default.Embed, _text2.default];
    // Lower index means deeper in the DOM tree, since not found (-1) is for embeds
    Inline.order = ['cursor', 'inline', // Must be lower
    'underline', 'strike', 'italic', 'bold', 'script', 'link', 'code' // Must be higher
    ];

    exports.default = Inline;

    /***/ }),
    /* 7 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var TextBlot = function (_Parchment$Text) {
      _inherits(TextBlot, _Parchment$Text);

      function TextBlot() {
        _classCallCheck(this, TextBlot);

        return _possibleConstructorReturn(this, (TextBlot.__proto__ || Object.getPrototypeOf(TextBlot)).apply(this, arguments));
      }

      return TextBlot;
    }(_parchment2.default.Text);

    exports.default = TextBlot;

    /***/ }),
    /* 8 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _eventemitter = __webpack_require__(54);

    var _eventemitter2 = _interopRequireDefault(_eventemitter);

    var _logger = __webpack_require__(10);

    var _logger2 = _interopRequireDefault(_logger);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var debug = (0, _logger2.default)('quill:events');

    var EVENTS = ['selectionchange', 'mousedown', 'mouseup', 'click'];

    EVENTS.forEach(function (eventName) {
      document.addEventListener(eventName, function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        [].slice.call(document.querySelectorAll('.ql-container')).forEach(function (node) {
          // TODO use WeakMap
          if (node.__quill && node.__quill.emitter) {
            var _node$__quill$emitter;

            (_node$__quill$emitter = node.__quill.emitter).handleDOM.apply(_node$__quill$emitter, args);
          }
        });
      });
    });

    var Emitter = function (_EventEmitter) {
      _inherits(Emitter, _EventEmitter);

      function Emitter() {
        _classCallCheck(this, Emitter);

        var _this = _possibleConstructorReturn(this, (Emitter.__proto__ || Object.getPrototypeOf(Emitter)).call(this));

        _this.listeners = {};
        _this.on('error', debug.error);
        return _this;
      }

      _createClass(Emitter, [{
        key: 'emit',
        value: function emit() {
          debug.log.apply(debug, arguments);
          _get(Emitter.prototype.__proto__ || Object.getPrototypeOf(Emitter.prototype), 'emit', this).apply(this, arguments);
        }
      }, {
        key: 'handleDOM',
        value: function handleDOM(event) {
          for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
          }

          (this.listeners[event.type] || []).forEach(function (_ref) {
            var node = _ref.node,
                handler = _ref.handler;

            if (event.target === node || node.contains(event.target)) {
              handler.apply(undefined, [event].concat(args));
            }
          });
        }
      }, {
        key: 'listenDOM',
        value: function listenDOM(eventName, node, handler) {
          if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
          }
          this.listeners[eventName].push({ node: node, handler: handler });
        }
      }]);

      return Emitter;
    }(_eventemitter2.default);

    Emitter.events = {
      EDITOR_CHANGE: 'editor-change',
      SCROLL_BEFORE_UPDATE: 'scroll-before-update',
      SCROLL_OPTIMIZE: 'scroll-optimize',
      SCROLL_UPDATE: 'scroll-update',
      SELECTION_CHANGE: 'selection-change',
      TEXT_CHANGE: 'text-change'
    };
    Emitter.sources = {
      API: 'api',
      SILENT: 'silent',
      USER: 'user'
    };

    exports.default = Emitter;

    /***/ }),
    /* 9 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Module = function Module(quill) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, Module);

      this.quill = quill;
      this.options = options;
    };

    Module.DEFAULTS = {};

    exports.default = Module;

    /***/ }),
    /* 10 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    var levels = ['error', 'warn', 'log', 'info'];
    var level = 'warn';

    function debug(method) {
      if (levels.indexOf(method) <= levels.indexOf(level)) {
        var _console;

        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        (_console = console)[method].apply(_console, args); // eslint-disable-line no-console
      }
    }

    function namespace(ns) {
      return levels.reduce(function (logger, method) {
        logger[method] = debug.bind(console, method, ns);
        return logger;
      }, {});
    }

    debug.level = namespace.level = function (newLevel) {
      level = newLevel;
    };

    exports.default = namespace;

    /***/ }),
    /* 11 */
    /***/ (function(module, exports, __webpack_require__) {

    var pSlice = Array.prototype.slice;
    var objectKeys = __webpack_require__(52);
    var isArguments = __webpack_require__(53);

    var deepEqual = module.exports = function (actual, expected, opts) {
      if (!opts) opts = {};
      // 7.1. All identical values are equivalent, as determined by ===.
      if (actual === expected) {
        return true;

      } else if (actual instanceof Date && expected instanceof Date) {
        return actual.getTime() === expected.getTime();

      // 7.3. Other pairs that do not both pass typeof value == 'object',
      // equivalence is determined by ==.
      } else if (!actual || !expected || typeof actual != 'object' && typeof expected != 'object') {
        return opts.strict ? actual === expected : actual == expected;

      // 7.4. For all other Object pairs, including Array objects, equivalence is
      // determined by having the same number of owned properties (as verified
      // with Object.prototype.hasOwnProperty.call), the same set of keys
      // (although not necessarily the same order), equivalent values for every
      // corresponding key, and an identical 'prototype' property. Note: this
      // accounts for both named and indexed properties on Arrays.
      } else {
        return objEquiv(actual, expected, opts);
      }
    };

    function isUndefinedOrNull(value) {
      return value === null || value === undefined;
    }

    function isBuffer (x) {
      if (!x || typeof x !== 'object' || typeof x.length !== 'number') return false;
      if (typeof x.copy !== 'function' || typeof x.slice !== 'function') {
        return false;
      }
      if (x.length > 0 && typeof x[0] !== 'number') return false;
      return true;
    }

    function objEquiv(a, b, opts) {
      var i, key;
      if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
        return false;
      // an identical 'prototype' property.
      if (a.prototype !== b.prototype) return false;
      //~~~I've managed to break Object.keys through screwy arguments passing.
      //   Converting to array solves the problem.
      if (isArguments(a)) {
        if (!isArguments(b)) {
          return false;
        }
        a = pSlice.call(a);
        b = pSlice.call(b);
        return deepEqual(a, b, opts);
      }
      if (isBuffer(a)) {
        if (!isBuffer(b)) {
          return false;
        }
        if (a.length !== b.length) return false;
        for (i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      }
      try {
        var ka = objectKeys(a),
            kb = objectKeys(b);
      } catch (e) {//happens when one is a string literal and the other isn't
        return false;
      }
      // having the same number of owned properties (keys incorporates
      // hasOwnProperty)
      if (ka.length != kb.length)
        return false;
      //the same set of keys (although not necessarily the same order),
      ka.sort();
      kb.sort();
      //~~~cheap key test
      for (i = ka.length - 1; i >= 0; i--) {
        if (ka[i] != kb[i])
          return false;
      }
      //equivalent values for every corresponding key, and
      //~~~possibly expensive deep test
      for (i = ka.length - 1; i >= 0; i--) {
        key = ka[i];
        if (!deepEqual(a[key], b[key], opts)) return false;
      }
      return typeof a === typeof b;
    }


    /***/ }),
    /* 12 */
    /***/ (function(module, exports, __webpack_require__) {

    Object.defineProperty(exports, "__esModule", { value: true });
    var Registry = __webpack_require__(1);
    var Attributor = /** @class */ (function () {
        function Attributor(attrName, keyName, options) {
            if (options === void 0) { options = {}; }
            this.attrName = attrName;
            this.keyName = keyName;
            var attributeBit = Registry.Scope.TYPE & Registry.Scope.ATTRIBUTE;
            if (options.scope != null) {
                // Ignore type bits, force attribute bit
                this.scope = (options.scope & Registry.Scope.LEVEL) | attributeBit;
            }
            else {
                this.scope = Registry.Scope.ATTRIBUTE;
            }
            if (options.whitelist != null)
                this.whitelist = options.whitelist;
        }
        Attributor.keys = function (node) {
            return [].map.call(node.attributes, function (item) {
                return item.name;
            });
        };
        Attributor.prototype.add = function (node, value) {
            if (!this.canAdd(node, value))
                return false;
            node.setAttribute(this.keyName, value);
            return true;
        };
        Attributor.prototype.canAdd = function (node, value) {
            var match = Registry.query(node, Registry.Scope.BLOT & (this.scope | Registry.Scope.TYPE));
            if (match == null)
                return false;
            if (this.whitelist == null)
                return true;
            if (typeof value === 'string') {
                return this.whitelist.indexOf(value.replace(/["']/g, '')) > -1;
            }
            else {
                return this.whitelist.indexOf(value) > -1;
            }
        };
        Attributor.prototype.remove = function (node) {
            node.removeAttribute(this.keyName);
        };
        Attributor.prototype.value = function (node) {
            var value = node.getAttribute(this.keyName);
            if (this.canAdd(node, value) && value) {
                return value;
            }
            return '';
        };
        return Attributor;
    }());
    exports.default = Attributor;


    /***/ }),
    /* 13 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.Code = undefined;

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    var _text = __webpack_require__(7);

    var _text2 = _interopRequireDefault(_text);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Code = function (_Inline) {
      _inherits(Code, _Inline);

      function Code() {
        _classCallCheck(this, Code);

        return _possibleConstructorReturn(this, (Code.__proto__ || Object.getPrototypeOf(Code)).apply(this, arguments));
      }

      return Code;
    }(_inline2.default);

    Code.blotName = 'code';
    Code.tagName = 'CODE';

    var CodeBlock = function (_Block) {
      _inherits(CodeBlock, _Block);

      function CodeBlock() {
        _classCallCheck(this, CodeBlock);

        return _possibleConstructorReturn(this, (CodeBlock.__proto__ || Object.getPrototypeOf(CodeBlock)).apply(this, arguments));
      }

      _createClass(CodeBlock, [{
        key: 'delta',
        value: function delta() {
          var _this3 = this;

          var text = this.domNode.textContent;
          if (text.endsWith('\n')) {
            // Should always be true
            text = text.slice(0, -1);
          }
          return text.split('\n').reduce(function (delta, frag) {
            return delta.insert(frag).insert('\n', _this3.formats());
          }, new _quillDelta2.default());
        }
      }, {
        key: 'format',
        value: function format(name, value) {
          if (name === this.statics.blotName && value) return;

          var _descendant = this.descendant(_text2.default, this.length() - 1),
              _descendant2 = _slicedToArray(_descendant, 1),
              text = _descendant2[0];

          if (text != null) {
            text.deleteAt(text.length() - 1, 1);
          }
          _get(CodeBlock.prototype.__proto__ || Object.getPrototypeOf(CodeBlock.prototype), 'format', this).call(this, name, value);
        }
      }, {
        key: 'formatAt',
        value: function formatAt(index, length, name, value) {
          if (length === 0) return;
          if (_parchment2.default.query(name, _parchment2.default.Scope.BLOCK) == null || name === this.statics.blotName && value === this.statics.formats(this.domNode)) {
            return;
          }
          var nextNewline = this.newlineIndex(index);
          if (nextNewline < 0 || nextNewline >= index + length) return;
          var prevNewline = this.newlineIndex(index, true) + 1;
          var isolateLength = nextNewline - prevNewline + 1;
          var blot = this.isolate(prevNewline, isolateLength);
          var next = blot.next;
          blot.format(name, value);
          if (next instanceof CodeBlock) {
            next.formatAt(0, index - prevNewline + length - isolateLength, name, value);
          }
        }
      }, {
        key: 'insertAt',
        value: function insertAt(index, value, def) {
          if (def != null) return;

          var _descendant3 = this.descendant(_text2.default, index),
              _descendant4 = _slicedToArray(_descendant3, 2),
              text = _descendant4[0],
              offset = _descendant4[1];

          text.insertAt(offset, value);
        }
      }, {
        key: 'length',
        value: function length() {
          var length = this.domNode.textContent.length;
          if (!this.domNode.textContent.endsWith('\n')) {
            return length + 1;
          }
          return length;
        }
      }, {
        key: 'newlineIndex',
        value: function newlineIndex(searchIndex) {
          var reverse = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

          if (!reverse) {
            var offset = this.domNode.textContent.slice(searchIndex).indexOf('\n');
            return offset > -1 ? searchIndex + offset : -1;
          } else {
            return this.domNode.textContent.slice(0, searchIndex).lastIndexOf('\n');
          }
        }
      }, {
        key: 'optimize',
        value: function optimize(context) {
          if (!this.domNode.textContent.endsWith('\n')) {
            this.appendChild(_parchment2.default.create('text', '\n'));
          }
          _get(CodeBlock.prototype.__proto__ || Object.getPrototypeOf(CodeBlock.prototype), 'optimize', this).call(this, context);
          var next = this.next;
          if (next != null && next.prev === this && next.statics.blotName === this.statics.blotName && this.statics.formats(this.domNode) === next.statics.formats(next.domNode)) {
            next.optimize(context);
            next.moveChildren(this);
            next.remove();
          }
        }
      }, {
        key: 'replace',
        value: function replace(target) {
          _get(CodeBlock.prototype.__proto__ || Object.getPrototypeOf(CodeBlock.prototype), 'replace', this).call(this, target);
          [].slice.call(this.domNode.querySelectorAll('*')).forEach(function (node) {
            var blot = _parchment2.default.find(node);
            if (blot == null) {
              node.parentNode.removeChild(node);
            } else if (blot instanceof _parchment2.default.Embed) {
              blot.remove();
            } else {
              blot.unwrap();
            }
          });
        }
      }], [{
        key: 'create',
        value: function create(value) {
          var domNode = _get(CodeBlock.__proto__ || Object.getPrototypeOf(CodeBlock), 'create', this).call(this, value);
          domNode.setAttribute('spellcheck', false);
          return domNode;
        }
      }, {
        key: 'formats',
        value: function formats() {
          return true;
        }
      }]);

      return CodeBlock;
    }(_block2.default);

    CodeBlock.blotName = 'code-block';
    CodeBlock.tagName = 'PRE';
    CodeBlock.TAB = '  ';

    exports.Code = Code;
    exports.default = CodeBlock;

    /***/ }),
    /* 14 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _op = __webpack_require__(20);

    var _op2 = _interopRequireDefault(_op);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _code = __webpack_require__(13);

    var _code2 = _interopRequireDefault(_code);

    var _cursor = __webpack_require__(24);

    var _cursor2 = _interopRequireDefault(_cursor);

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    var _break = __webpack_require__(16);

    var _break2 = _interopRequireDefault(_break);

    var _clone = __webpack_require__(21);

    var _clone2 = _interopRequireDefault(_clone);

    var _deepEqual = __webpack_require__(11);

    var _deepEqual2 = _interopRequireDefault(_deepEqual);

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var ASCII = /^[ -~]*$/;

    var Editor = function () {
      function Editor(scroll) {
        _classCallCheck(this, Editor);

        this.scroll = scroll;
        this.delta = this.getDelta();
      }

      _createClass(Editor, [{
        key: 'applyDelta',
        value: function applyDelta(delta) {
          var _this = this;

          var consumeNextNewline = false;
          this.scroll.update();
          var scrollLength = this.scroll.length();
          this.scroll.batchStart();
          delta = normalizeDelta(delta);
          delta.reduce(function (index, op) {
            var length = op.retain || op.delete || op.insert.length || 1;
            var attributes = op.attributes || {};
            if (op.insert != null) {
              if (typeof op.insert === 'string') {
                var text = op.insert;
                if (text.endsWith('\n') && consumeNextNewline) {
                  consumeNextNewline = false;
                  text = text.slice(0, -1);
                }
                if (index >= scrollLength && !text.endsWith('\n')) {
                  consumeNextNewline = true;
                }
                _this.scroll.insertAt(index, text);

                var _scroll$line = _this.scroll.line(index),
                    _scroll$line2 = _slicedToArray(_scroll$line, 2),
                    line = _scroll$line2[0],
                    offset = _scroll$line2[1];

                var formats = (0, _extend2.default)({}, (0, _block.bubbleFormats)(line));
                if (line instanceof _block2.default) {
                  var _line$descendant = line.descendant(_parchment2.default.Leaf, offset),
                      _line$descendant2 = _slicedToArray(_line$descendant, 1),
                      leaf = _line$descendant2[0];

                  formats = (0, _extend2.default)(formats, (0, _block.bubbleFormats)(leaf));
                }
                attributes = _op2.default.attributes.diff(formats, attributes) || {};
              } else if (_typeof(op.insert) === 'object') {
                var key = Object.keys(op.insert)[0]; // There should only be one key
                if (key == null) return index;
                _this.scroll.insertAt(index, key, op.insert[key]);
              }
              scrollLength += length;
            }
            Object.keys(attributes).forEach(function (name) {
              _this.scroll.formatAt(index, length, name, attributes[name]);
            });
            return index + length;
          }, 0);
          delta.reduce(function (index, op) {
            if (typeof op.delete === 'number') {
              _this.scroll.deleteAt(index, op.delete);
              return index;
            }
            return index + (op.retain || op.insert.length || 1);
          }, 0);
          this.scroll.batchEnd();
          return this.update(delta);
        }
      }, {
        key: 'deleteText',
        value: function deleteText(index, length) {
          this.scroll.deleteAt(index, length);
          return this.update(new _quillDelta2.default().retain(index).delete(length));
        }
      }, {
        key: 'formatLine',
        value: function formatLine(index, length) {
          var _this2 = this;

          var formats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

          this.scroll.update();
          Object.keys(formats).forEach(function (format) {
            if (_this2.scroll.whitelist != null && !_this2.scroll.whitelist[format]) return;
            var lines = _this2.scroll.lines(index, Math.max(length, 1));
            var lengthRemaining = length;
            lines.forEach(function (line) {
              var lineLength = line.length();
              if (!(line instanceof _code2.default)) {
                line.format(format, formats[format]);
              } else {
                var codeIndex = index - line.offset(_this2.scroll);
                var codeLength = line.newlineIndex(codeIndex + lengthRemaining) - codeIndex + 1;
                line.formatAt(codeIndex, codeLength, format, formats[format]);
              }
              lengthRemaining -= lineLength;
            });
          });
          this.scroll.optimize();
          return this.update(new _quillDelta2.default().retain(index).retain(length, (0, _clone2.default)(formats)));
        }
      }, {
        key: 'formatText',
        value: function formatText(index, length) {
          var _this3 = this;

          var formats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

          Object.keys(formats).forEach(function (format) {
            _this3.scroll.formatAt(index, length, format, formats[format]);
          });
          return this.update(new _quillDelta2.default().retain(index).retain(length, (0, _clone2.default)(formats)));
        }
      }, {
        key: 'getContents',
        value: function getContents(index, length) {
          return this.delta.slice(index, index + length);
        }
      }, {
        key: 'getDelta',
        value: function getDelta() {
          return this.scroll.lines().reduce(function (delta, line) {
            return delta.concat(line.delta());
          }, new _quillDelta2.default());
        }
      }, {
        key: 'getFormat',
        value: function getFormat(index) {
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

          var lines = [],
              leaves = [];
          if (length === 0) {
            this.scroll.path(index).forEach(function (path) {
              var _path = _slicedToArray(path, 1),
                  blot = _path[0];

              if (blot instanceof _block2.default) {
                lines.push(blot);
              } else if (blot instanceof _parchment2.default.Leaf) {
                leaves.push(blot);
              }
            });
          } else {
            lines = this.scroll.lines(index, length);
            leaves = this.scroll.descendants(_parchment2.default.Leaf, index, length);
          }
          var formatsArr = [lines, leaves].map(function (blots) {
            if (blots.length === 0) return {};
            var formats = (0, _block.bubbleFormats)(blots.shift());
            while (Object.keys(formats).length > 0) {
              var blot = blots.shift();
              if (blot == null) return formats;
              formats = combineFormats((0, _block.bubbleFormats)(blot), formats);
            }
            return formats;
          });
          return _extend2.default.apply(_extend2.default, formatsArr);
        }
      }, {
        key: 'getText',
        value: function getText(index, length) {
          return this.getContents(index, length).filter(function (op) {
            return typeof op.insert === 'string';
          }).map(function (op) {
            return op.insert;
          }).join('');
        }
      }, {
        key: 'insertEmbed',
        value: function insertEmbed(index, embed, value) {
          this.scroll.insertAt(index, embed, value);
          return this.update(new _quillDelta2.default().retain(index).insert(_defineProperty({}, embed, value)));
        }
      }, {
        key: 'insertText',
        value: function insertText(index, text) {
          var _this4 = this;

          var formats = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

          text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          this.scroll.insertAt(index, text);
          Object.keys(formats).forEach(function (format) {
            _this4.scroll.formatAt(index, text.length, format, formats[format]);
          });
          return this.update(new _quillDelta2.default().retain(index).insert(text, (0, _clone2.default)(formats)));
        }
      }, {
        key: 'isBlank',
        value: function isBlank() {
          if (this.scroll.children.length == 0) return true;
          if (this.scroll.children.length > 1) return false;
          var block = this.scroll.children.head;
          if (block.statics.blotName !== _block2.default.blotName) return false;
          if (block.children.length > 1) return false;
          return block.children.head instanceof _break2.default;
        }
      }, {
        key: 'removeFormat',
        value: function removeFormat(index, length) {
          var text = this.getText(index, length);

          var _scroll$line3 = this.scroll.line(index + length),
              _scroll$line4 = _slicedToArray(_scroll$line3, 2),
              line = _scroll$line4[0],
              offset = _scroll$line4[1];

          var suffixLength = 0,
              suffix = new _quillDelta2.default();
          if (line != null) {
            if (!(line instanceof _code2.default)) {
              suffixLength = line.length() - offset;
            } else {
              suffixLength = line.newlineIndex(offset) - offset + 1;
            }
            suffix = line.delta().slice(offset, offset + suffixLength - 1).insert('\n');
          }
          var contents = this.getContents(index, length + suffixLength);
          var diff = contents.diff(new _quillDelta2.default().insert(text).concat(suffix));
          var delta = new _quillDelta2.default().retain(index).concat(diff);
          return this.applyDelta(delta);
        }
      }, {
        key: 'update',
        value: function update(change) {
          var mutations = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
          var cursorIndex = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : undefined;

          var oldDelta = this.delta;
          if (mutations.length === 1 && mutations[0].type === 'characterData' && mutations[0].target.data.match(ASCII) && _parchment2.default.find(mutations[0].target)) {
            // Optimization for character changes
            var textBlot = _parchment2.default.find(mutations[0].target);
            var formats = (0, _block.bubbleFormats)(textBlot);
            var index = textBlot.offset(this.scroll);
            var oldValue = mutations[0].oldValue.replace(_cursor2.default.CONTENTS, '');
            var oldText = new _quillDelta2.default().insert(oldValue);
            var newText = new _quillDelta2.default().insert(textBlot.value());
            var diffDelta = new _quillDelta2.default().retain(index).concat(oldText.diff(newText, cursorIndex));
            change = diffDelta.reduce(function (delta, op) {
              if (op.insert) {
                return delta.insert(op.insert, formats);
              } else {
                return delta.push(op);
              }
            }, new _quillDelta2.default());
            this.delta = oldDelta.compose(change);
          } else {
            this.delta = this.getDelta();
            if (!change || !(0, _deepEqual2.default)(oldDelta.compose(change), this.delta)) {
              change = oldDelta.diff(this.delta, cursorIndex);
            }
          }
          return change;
        }
      }]);

      return Editor;
    }();

    function combineFormats(formats, combined) {
      return Object.keys(combined).reduce(function (merged, name) {
        if (formats[name] == null) return merged;
        if (combined[name] === formats[name]) {
          merged[name] = combined[name];
        } else if (Array.isArray(combined[name])) {
          if (combined[name].indexOf(formats[name]) < 0) {
            merged[name] = combined[name].concat([formats[name]]);
          }
        } else {
          merged[name] = [combined[name], formats[name]];
        }
        return merged;
      }, {});
    }

    function normalizeDelta(delta) {
      return delta.reduce(function (delta, op) {
        if (op.insert === 1) {
          var attributes = (0, _clone2.default)(op.attributes);
          delete attributes['image'];
          return delta.insert({ image: op.attributes.image }, attributes);
        }
        if (op.attributes != null && (op.attributes.list === true || op.attributes.bullet === true)) {
          op = (0, _clone2.default)(op);
          if (op.attributes.list) {
            op.attributes.list = 'ordered';
          } else {
            op.attributes.list = 'bullet';
            delete op.attributes.bullet;
          }
        }
        if (typeof op.insert === 'string') {
          var text = op.insert.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          return delta.insert(text, op.attributes);
        }
        return delta.push(op);
      }, new _quillDelta2.default());
    }

    exports.default = Editor;

    /***/ }),
    /* 15 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.Range = undefined;

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _clone = __webpack_require__(21);

    var _clone2 = _interopRequireDefault(_clone);

    var _deepEqual = __webpack_require__(11);

    var _deepEqual2 = _interopRequireDefault(_deepEqual);

    var _emitter3 = __webpack_require__(8);

    var _emitter4 = _interopRequireDefault(_emitter3);

    var _logger = __webpack_require__(10);

    var _logger2 = _interopRequireDefault(_logger);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var debug = (0, _logger2.default)('quill:selection');

    var Range = function Range(index) {
      var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

      _classCallCheck(this, Range);

      this.index = index;
      this.length = length;
    };

    var Selection = function () {
      function Selection(scroll, emitter) {
        var _this = this;

        _classCallCheck(this, Selection);

        this.emitter = emitter;
        this.scroll = scroll;
        this.composing = false;
        this.mouseDown = false;
        this.root = this.scroll.domNode;
        this.cursor = _parchment2.default.create('cursor', this);
        // savedRange is last non-null range
        this.lastRange = this.savedRange = new Range(0, 0);
        this.handleComposition();
        this.handleDragging();
        this.emitter.listenDOM('selectionchange', document, function () {
          if (!_this.mouseDown) {
            setTimeout(_this.update.bind(_this, _emitter4.default.sources.USER), 1);
          }
        });
        this.emitter.on(_emitter4.default.events.EDITOR_CHANGE, function (type, delta) {
          if (type === _emitter4.default.events.TEXT_CHANGE && delta.length() > 0) {
            _this.update(_emitter4.default.sources.SILENT);
          }
        });
        this.emitter.on(_emitter4.default.events.SCROLL_BEFORE_UPDATE, function () {
          if (!_this.hasFocus()) return;
          var native = _this.getNativeRange();
          if (native == null) return;
          if (native.start.node === _this.cursor.textNode) return; // cursor.restore() will handle
          // TODO unclear if this has negative side effects
          _this.emitter.once(_emitter4.default.events.SCROLL_UPDATE, function () {
            try {
              _this.setNativeRange(native.start.node, native.start.offset, native.end.node, native.end.offset);
            } catch (ignored) {}
          });
        });
        this.emitter.on(_emitter4.default.events.SCROLL_OPTIMIZE, function (mutations, context) {
          if (context.range) {
            var _context$range = context.range,
                startNode = _context$range.startNode,
                startOffset = _context$range.startOffset,
                endNode = _context$range.endNode,
                endOffset = _context$range.endOffset;

            _this.setNativeRange(startNode, startOffset, endNode, endOffset);
          }
        });
        this.update(_emitter4.default.sources.SILENT);
      }

      _createClass(Selection, [{
        key: 'handleComposition',
        value: function handleComposition() {
          var _this2 = this;

          this.root.addEventListener('compositionstart', function () {
            _this2.composing = true;
          });
          this.root.addEventListener('compositionend', function () {
            _this2.composing = false;
            if (_this2.cursor.parent) {
              var range = _this2.cursor.restore();
              if (!range) return;
              setTimeout(function () {
                _this2.setNativeRange(range.startNode, range.startOffset, range.endNode, range.endOffset);
              }, 1);
            }
          });
        }
      }, {
        key: 'handleDragging',
        value: function handleDragging() {
          var _this3 = this;

          this.emitter.listenDOM('mousedown', document.body, function () {
            _this3.mouseDown = true;
          });
          this.emitter.listenDOM('mouseup', document.body, function () {
            _this3.mouseDown = false;
            _this3.update(_emitter4.default.sources.USER);
          });
        }
      }, {
        key: 'focus',
        value: function focus() {
          if (this.hasFocus()) return;
          this.root.focus();
          this.setRange(this.savedRange);
        }
      }, {
        key: 'format',
        value: function format(_format, value) {
          if (this.scroll.whitelist != null && !this.scroll.whitelist[_format]) return;
          this.scroll.update();
          var nativeRange = this.getNativeRange();
          if (nativeRange == null || !nativeRange.native.collapsed || _parchment2.default.query(_format, _parchment2.default.Scope.BLOCK)) return;
          if (nativeRange.start.node !== this.cursor.textNode) {
            var blot = _parchment2.default.find(nativeRange.start.node, false);
            if (blot == null) return;
            // TODO Give blot ability to not split
            if (blot instanceof _parchment2.default.Leaf) {
              var after = blot.split(nativeRange.start.offset);
              blot.parent.insertBefore(this.cursor, after);
            } else {
              blot.insertBefore(this.cursor, nativeRange.start.node); // Should never happen
            }
            this.cursor.attach();
          }
          this.cursor.format(_format, value);
          this.scroll.optimize();
          this.setNativeRange(this.cursor.textNode, this.cursor.textNode.data.length);
          this.update();
        }
      }, {
        key: 'getBounds',
        value: function getBounds(index) {
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

          var scrollLength = this.scroll.length();
          index = Math.min(index, scrollLength - 1);
          length = Math.min(index + length, scrollLength - 1) - index;
          var node = void 0,
              _scroll$leaf = this.scroll.leaf(index),
              _scroll$leaf2 = _slicedToArray(_scroll$leaf, 2),
              leaf = _scroll$leaf2[0],
              offset = _scroll$leaf2[1];
          if (leaf == null) return null;

          var _leaf$position = leaf.position(offset, true);

          var _leaf$position2 = _slicedToArray(_leaf$position, 2);

          node = _leaf$position2[0];
          offset = _leaf$position2[1];

          var range = document.createRange();
          if (length > 0) {
            range.setStart(node, offset);

            var _scroll$leaf3 = this.scroll.leaf(index + length);

            var _scroll$leaf4 = _slicedToArray(_scroll$leaf3, 2);

            leaf = _scroll$leaf4[0];
            offset = _scroll$leaf4[1];

            if (leaf == null) return null;

            var _leaf$position3 = leaf.position(offset, true);

            var _leaf$position4 = _slicedToArray(_leaf$position3, 2);

            node = _leaf$position4[0];
            offset = _leaf$position4[1];

            range.setEnd(node, offset);
            return range.getBoundingClientRect();
          } else {
            var side = 'left';
            var rect = void 0;
            if (node instanceof Text) {
              if (offset < node.data.length) {
                range.setStart(node, offset);
                range.setEnd(node, offset + 1);
              } else {
                range.setStart(node, offset - 1);
                range.setEnd(node, offset);
                side = 'right';
              }
              rect = range.getBoundingClientRect();
            } else {
              rect = leaf.domNode.getBoundingClientRect();
              if (offset > 0) side = 'right';
            }
            return {
              bottom: rect.top + rect.height,
              height: rect.height,
              left: rect[side],
              right: rect[side],
              top: rect.top,
              width: 0
            };
          }
        }
      }, {
        key: 'getNativeRange',
        value: function getNativeRange() {
          var selection = document.getSelection();
          if (selection == null || selection.rangeCount <= 0) return null;
          var nativeRange = selection.getRangeAt(0);
          if (nativeRange == null) return null;
          var range = this.normalizeNative(nativeRange);
          debug.info('getNativeRange', range);
          return range;
        }
      }, {
        key: 'getRange',
        value: function getRange() {
          var normalized = this.getNativeRange();
          if (normalized == null) return [null, null];
          var range = this.normalizedToRange(normalized);
          return [range, normalized];
        }
      }, {
        key: 'hasFocus',
        value: function hasFocus() {
          return document.activeElement === this.root;
        }
      }, {
        key: 'normalizedToRange',
        value: function normalizedToRange(range) {
          var _this4 = this;

          var positions = [[range.start.node, range.start.offset]];
          if (!range.native.collapsed) {
            positions.push([range.end.node, range.end.offset]);
          }
          var indexes = positions.map(function (position) {
            var _position = _slicedToArray(position, 2),
                node = _position[0],
                offset = _position[1];

            var blot = _parchment2.default.find(node, true);
            var index = blot.offset(_this4.scroll);
            if (offset === 0) {
              return index;
            } else if (blot instanceof _parchment2.default.Container) {
              return index + blot.length();
            } else {
              return index + blot.index(node, offset);
            }
          });
          var end = Math.min(Math.max.apply(Math, _toConsumableArray(indexes)), this.scroll.length() - 1);
          var start = Math.min.apply(Math, [end].concat(_toConsumableArray(indexes)));
          return new Range(start, end - start);
        }
      }, {
        key: 'normalizeNative',
        value: function normalizeNative(nativeRange) {
          if (!contains(this.root, nativeRange.startContainer) || !nativeRange.collapsed && !contains(this.root, nativeRange.endContainer)) {
            return null;
          }
          var range = {
            start: { node: nativeRange.startContainer, offset: nativeRange.startOffset },
            end: { node: nativeRange.endContainer, offset: nativeRange.endOffset },
            native: nativeRange
          };
          [range.start, range.end].forEach(function (position) {
            var node = position.node,
                offset = position.offset;
            while (!(node instanceof Text) && node.childNodes.length > 0) {
              if (node.childNodes.length > offset) {
                node = node.childNodes[offset];
                offset = 0;
              } else if (node.childNodes.length === offset) {
                node = node.lastChild;
                offset = node instanceof Text ? node.data.length : node.childNodes.length + 1;
              } else {
                break;
              }
            }
            position.node = node, position.offset = offset;
          });
          return range;
        }
      }, {
        key: 'rangeToNative',
        value: function rangeToNative(range) {
          var _this5 = this;

          var indexes = range.collapsed ? [range.index] : [range.index, range.index + range.length];
          var args = [];
          var scrollLength = this.scroll.length();
          indexes.forEach(function (index, i) {
            index = Math.min(scrollLength - 1, index);
            var node = void 0,
                _scroll$leaf5 = _this5.scroll.leaf(index),
                _scroll$leaf6 = _slicedToArray(_scroll$leaf5, 2),
                leaf = _scroll$leaf6[0],
                offset = _scroll$leaf6[1];
            var _leaf$position5 = leaf.position(offset, i !== 0);

            var _leaf$position6 = _slicedToArray(_leaf$position5, 2);

            node = _leaf$position6[0];
            offset = _leaf$position6[1];

            args.push(node, offset);
          });
          if (args.length < 2) {
            args = args.concat(args);
          }
          return args;
        }
      }, {
        key: 'scrollIntoView',
        value: function scrollIntoView(scrollingContainer) {
          var range = this.lastRange;
          if (range == null) return;
          var bounds = this.getBounds(range.index, range.length);
          if (bounds == null) return;
          var limit = this.scroll.length() - 1;

          var _scroll$line = this.scroll.line(Math.min(range.index, limit)),
              _scroll$line2 = _slicedToArray(_scroll$line, 1),
              first = _scroll$line2[0];

          var last = first;
          if (range.length > 0) {
            var _scroll$line3 = this.scroll.line(Math.min(range.index + range.length, limit));

            var _scroll$line4 = _slicedToArray(_scroll$line3, 1);

            last = _scroll$line4[0];
          }
          if (first == null || last == null) return;
          var scrollBounds = scrollingContainer.getBoundingClientRect();
          if (bounds.top < scrollBounds.top) {
            scrollingContainer.scrollTop -= scrollBounds.top - bounds.top;
          } else if (bounds.bottom > scrollBounds.bottom) {
            scrollingContainer.scrollTop += bounds.bottom - scrollBounds.bottom;
          }
        }
      }, {
        key: 'setNativeRange',
        value: function setNativeRange(startNode, startOffset) {
          var endNode = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : startNode;
          var endOffset = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : startOffset;
          var force = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

          debug.info('setNativeRange', startNode, startOffset, endNode, endOffset);
          if (startNode != null && (this.root.parentNode == null || startNode.parentNode == null || endNode.parentNode == null)) {
            return;
          }
          var selection = document.getSelection();
          if (selection == null) return;
          if (startNode != null) {
            if (!this.hasFocus()) this.root.focus();
            var native = (this.getNativeRange() || {}).native;
            if (native == null || force || startNode !== native.startContainer || startOffset !== native.startOffset || endNode !== native.endContainer || endOffset !== native.endOffset) {

              if (startNode.tagName == "BR") {
                startOffset = [].indexOf.call(startNode.parentNode.childNodes, startNode);
                startNode = startNode.parentNode;
              }
              if (endNode.tagName == "BR") {
                endOffset = [].indexOf.call(endNode.parentNode.childNodes, endNode);
                endNode = endNode.parentNode;
              }
              var range = document.createRange();
              range.setStart(startNode, startOffset);
              range.setEnd(endNode, endOffset);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          } else {
            selection.removeAllRanges();
            this.root.blur();
            document.body.focus(); // root.blur() not enough on IE11+Travis+SauceLabs (but not local VMs)
          }
        }
      }, {
        key: 'setRange',
        value: function setRange(range) {
          var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
          var source = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _emitter4.default.sources.API;

          if (typeof force === 'string') {
            source = force;
            force = false;
          }
          debug.info('setRange', range);
          if (range != null) {
            var args = this.rangeToNative(range);
            this.setNativeRange.apply(this, _toConsumableArray(args).concat([force]));
          } else {
            this.setNativeRange(null);
          }
          this.update(source);
        }
      }, {
        key: 'update',
        value: function update() {
          var source = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _emitter4.default.sources.USER;

          var oldRange = this.lastRange;

          var _getRange = this.getRange(),
              _getRange2 = _slicedToArray(_getRange, 2),
              lastRange = _getRange2[0],
              nativeRange = _getRange2[1];

          this.lastRange = lastRange;
          if (this.lastRange != null) {
            this.savedRange = this.lastRange;
          }
          if (!(0, _deepEqual2.default)(oldRange, this.lastRange)) {
            var _emitter;

            if (!this.composing && nativeRange != null && nativeRange.native.collapsed && nativeRange.start.node !== this.cursor.textNode) {
              this.cursor.restore();
            }
            var args = [_emitter4.default.events.SELECTION_CHANGE, (0, _clone2.default)(this.lastRange), (0, _clone2.default)(oldRange), source];
            (_emitter = this.emitter).emit.apply(_emitter, [_emitter4.default.events.EDITOR_CHANGE].concat(args));
            if (source !== _emitter4.default.sources.SILENT) {
              var _emitter2;

              (_emitter2 = this.emitter).emit.apply(_emitter2, args);
            }
          }
        }
      }]);

      return Selection;
    }();

    function contains(parent, descendant) {
      try {
        // Firefox inserts inaccessible nodes around video elements
        descendant.parentNode;
      } catch (e) {
        return false;
      }
      // IE11 has bug with Text nodes
      // https://connect.microsoft.com/IE/feedback/details/780874/node-contains-is-incorrect
      if (descendant instanceof Text) {
        descendant = descendant.parentNode;
      }
      return parent.contains(descendant);
    }

    exports.Range = Range;
    exports.default = Selection;

    /***/ }),
    /* 16 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Break = function (_Parchment$Embed) {
      _inherits(Break, _Parchment$Embed);

      function Break() {
        _classCallCheck(this, Break);

        return _possibleConstructorReturn(this, (Break.__proto__ || Object.getPrototypeOf(Break)).apply(this, arguments));
      }

      _createClass(Break, [{
        key: 'insertInto',
        value: function insertInto(parent, ref) {
          if (parent.children.length === 0) {
            _get(Break.prototype.__proto__ || Object.getPrototypeOf(Break.prototype), 'insertInto', this).call(this, parent, ref);
          } else {
            this.remove();
          }
        }
      }, {
        key: 'length',
        value: function length() {
          return 0;
        }
      }, {
        key: 'value',
        value: function value() {
          return '';
        }
      }], [{
        key: 'value',
        value: function value() {
          return undefined;
        }
      }]);

      return Break;
    }(_parchment2.default.Embed);

    Break.blotName = 'break';
    Break.tagName = 'BR';

    exports.default = Break;

    /***/ }),
    /* 17 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var linked_list_1 = __webpack_require__(44);
    var shadow_1 = __webpack_require__(30);
    var Registry = __webpack_require__(1);
    var ContainerBlot = /** @class */ (function (_super) {
        __extends(ContainerBlot, _super);
        function ContainerBlot(domNode) {
            var _this = _super.call(this, domNode) || this;
            _this.build();
            return _this;
        }
        ContainerBlot.prototype.appendChild = function (other) {
            this.insertBefore(other);
        };
        ContainerBlot.prototype.attach = function () {
            _super.prototype.attach.call(this);
            this.children.forEach(function (child) {
                child.attach();
            });
        };
        ContainerBlot.prototype.build = function () {
            var _this = this;
            this.children = new linked_list_1.default();
            // Need to be reversed for if DOM nodes already in order
            [].slice
                .call(this.domNode.childNodes)
                .reverse()
                .forEach(function (node) {
                try {
                    var child = makeBlot(node);
                    _this.insertBefore(child, _this.children.head || undefined);
                }
                catch (err) {
                    if (err instanceof Registry.ParchmentError)
                        return;
                    else
                        throw err;
                }
            });
        };
        ContainerBlot.prototype.deleteAt = function (index, length) {
            if (index === 0 && length === this.length()) {
                return this.remove();
            }
            this.children.forEachAt(index, length, function (child, offset, length) {
                child.deleteAt(offset, length);
            });
        };
        ContainerBlot.prototype.descendant = function (criteria, index) {
            var _a = this.children.find(index), child = _a[0], offset = _a[1];
            if ((criteria.blotName == null && criteria(child)) ||
                (criteria.blotName != null && child instanceof criteria)) {
                return [child, offset];
            }
            else if (child instanceof ContainerBlot) {
                return child.descendant(criteria, offset);
            }
            else {
                return [null, -1];
            }
        };
        ContainerBlot.prototype.descendants = function (criteria, index, length) {
            if (index === void 0) { index = 0; }
            if (length === void 0) { length = Number.MAX_VALUE; }
            var descendants = [];
            var lengthLeft = length;
            this.children.forEachAt(index, length, function (child, index, length) {
                if ((criteria.blotName == null && criteria(child)) ||
                    (criteria.blotName != null && child instanceof criteria)) {
                    descendants.push(child);
                }
                if (child instanceof ContainerBlot) {
                    descendants = descendants.concat(child.descendants(criteria, index, lengthLeft));
                }
                lengthLeft -= length;
            });
            return descendants;
        };
        ContainerBlot.prototype.detach = function () {
            this.children.forEach(function (child) {
                child.detach();
            });
            _super.prototype.detach.call(this);
        };
        ContainerBlot.prototype.formatAt = function (index, length, name, value) {
            this.children.forEachAt(index, length, function (child, offset, length) {
                child.formatAt(offset, length, name, value);
            });
        };
        ContainerBlot.prototype.insertAt = function (index, value, def) {
            var _a = this.children.find(index), child = _a[0], offset = _a[1];
            if (child) {
                child.insertAt(offset, value, def);
            }
            else {
                var blot = def == null ? Registry.create('text', value) : Registry.create(value, def);
                this.appendChild(blot);
            }
        };
        ContainerBlot.prototype.insertBefore = function (childBlot, refBlot) {
            if (this.statics.allowedChildren != null &&
                !this.statics.allowedChildren.some(function (child) {
                    return childBlot instanceof child;
                })) {
                throw new Registry.ParchmentError("Cannot insert " + childBlot.statics.blotName + " into " + this.statics.blotName);
            }
            childBlot.insertInto(this, refBlot);
        };
        ContainerBlot.prototype.length = function () {
            return this.children.reduce(function (memo, child) {
                return memo + child.length();
            }, 0);
        };
        ContainerBlot.prototype.moveChildren = function (targetParent, refNode) {
            this.children.forEach(function (child) {
                targetParent.insertBefore(child, refNode);
            });
        };
        ContainerBlot.prototype.optimize = function (context) {
            _super.prototype.optimize.call(this, context);
            if (this.children.length === 0) {
                if (this.statics.defaultChild != null) {
                    var child = Registry.create(this.statics.defaultChild);
                    this.appendChild(child);
                    child.optimize(context);
                }
                else {
                    this.remove();
                }
            }
        };
        ContainerBlot.prototype.path = function (index, inclusive) {
            if (inclusive === void 0) { inclusive = false; }
            var _a = this.children.find(index, inclusive), child = _a[0], offset = _a[1];
            var position = [[this, index]];
            if (child instanceof ContainerBlot) {
                return position.concat(child.path(offset, inclusive));
            }
            else if (child != null) {
                position.push([child, offset]);
            }
            return position;
        };
        ContainerBlot.prototype.removeChild = function (child) {
            this.children.remove(child);
        };
        ContainerBlot.prototype.replace = function (target) {
            if (target instanceof ContainerBlot) {
                target.moveChildren(this);
            }
            _super.prototype.replace.call(this, target);
        };
        ContainerBlot.prototype.split = function (index, force) {
            if (force === void 0) { force = false; }
            if (!force) {
                if (index === 0)
                    return this;
                if (index === this.length())
                    return this.next;
            }
            var after = this.clone();
            this.parent.insertBefore(after, this.next);
            this.children.forEachAt(index, this.length(), function (child, offset, length) {
                child = child.split(offset, force);
                after.appendChild(child);
            });
            return after;
        };
        ContainerBlot.prototype.unwrap = function () {
            this.moveChildren(this.parent, this.next);
            this.remove();
        };
        ContainerBlot.prototype.update = function (mutations, context) {
            var _this = this;
            var addedNodes = [];
            var removedNodes = [];
            mutations.forEach(function (mutation) {
                if (mutation.target === _this.domNode && mutation.type === 'childList') {
                    addedNodes.push.apply(addedNodes, mutation.addedNodes);
                    removedNodes.push.apply(removedNodes, mutation.removedNodes);
                }
            });
            removedNodes.forEach(function (node) {
                // Check node has actually been removed
                // One exception is Chrome does not immediately remove IFRAMEs
                // from DOM but MutationRecord is correct in its reported removal
                if (node.parentNode != null &&
                    // @ts-ignore
                    node.tagName !== 'IFRAME' &&
                    document.body.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINED_BY) {
                    return;
                }
                var blot = Registry.find(node);
                if (blot == null)
                    return;
                if (blot.domNode.parentNode == null || blot.domNode.parentNode === _this.domNode) {
                    blot.detach();
                }
            });
            addedNodes
                .filter(function (node) {
                return node.parentNode == _this.domNode;
            })
                .sort(function (a, b) {
                if (a === b)
                    return 0;
                if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) {
                    return 1;
                }
                return -1;
            })
                .forEach(function (node) {
                var refBlot = null;
                if (node.nextSibling != null) {
                    refBlot = Registry.find(node.nextSibling);
                }
                var blot = makeBlot(node);
                if (blot.next != refBlot || blot.next == null) {
                    if (blot.parent != null) {
                        blot.parent.removeChild(_this);
                    }
                    _this.insertBefore(blot, refBlot || undefined);
                }
            });
        };
        return ContainerBlot;
    }(shadow_1.default));
    function makeBlot(node) {
        var blot = Registry.find(node);
        if (blot == null) {
            try {
                blot = Registry.create(node);
            }
            catch (e) {
                blot = Registry.create(Registry.Scope.INLINE);
                [].slice.call(node.childNodes).forEach(function (child) {
                    // @ts-ignore
                    blot.domNode.appendChild(child);
                });
                if (node.parentNode) {
                    node.parentNode.replaceChild(blot.domNode, node);
                }
                blot.attach();
            }
        }
        return blot;
    }
    exports.default = ContainerBlot;


    /***/ }),
    /* 18 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var attributor_1 = __webpack_require__(12);
    var store_1 = __webpack_require__(31);
    var container_1 = __webpack_require__(17);
    var Registry = __webpack_require__(1);
    var FormatBlot = /** @class */ (function (_super) {
        __extends(FormatBlot, _super);
        function FormatBlot(domNode) {
            var _this = _super.call(this, domNode) || this;
            _this.attributes = new store_1.default(_this.domNode);
            return _this;
        }
        FormatBlot.formats = function (domNode) {
            if (typeof this.tagName === 'string') {
                return true;
            }
            else if (Array.isArray(this.tagName)) {
                return domNode.tagName.toLowerCase();
            }
            return undefined;
        };
        FormatBlot.prototype.format = function (name, value) {
            var format = Registry.query(name);
            if (format instanceof attributor_1.default) {
                this.attributes.attribute(format, value);
            }
            else if (value) {
                if (format != null && (name !== this.statics.blotName || this.formats()[name] !== value)) {
                    this.replaceWith(name, value);
                }
            }
        };
        FormatBlot.prototype.formats = function () {
            var formats = this.attributes.values();
            var format = this.statics.formats(this.domNode);
            if (format != null) {
                formats[this.statics.blotName] = format;
            }
            return formats;
        };
        FormatBlot.prototype.replaceWith = function (name, value) {
            var replacement = _super.prototype.replaceWith.call(this, name, value);
            this.attributes.copy(replacement);
            return replacement;
        };
        FormatBlot.prototype.update = function (mutations, context) {
            var _this = this;
            _super.prototype.update.call(this, mutations, context);
            if (mutations.some(function (mutation) {
                return mutation.target === _this.domNode && mutation.type === 'attributes';
            })) {
                this.attributes.build();
            }
        };
        FormatBlot.prototype.wrap = function (name, value) {
            var wrapper = _super.prototype.wrap.call(this, name, value);
            if (wrapper instanceof FormatBlot && wrapper.statics.scope === this.statics.scope) {
                this.attributes.move(wrapper);
            }
            return wrapper;
        };
        return FormatBlot;
    }(container_1.default));
    exports.default = FormatBlot;


    /***/ }),
    /* 19 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var shadow_1 = __webpack_require__(30);
    var Registry = __webpack_require__(1);
    var LeafBlot = /** @class */ (function (_super) {
        __extends(LeafBlot, _super);
        function LeafBlot() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        LeafBlot.value = function (domNode) {
            return true;
        };
        LeafBlot.prototype.index = function (node, offset) {
            if (this.domNode === node ||
                this.domNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINED_BY) {
                return Math.min(offset, 1);
            }
            return -1;
        };
        LeafBlot.prototype.position = function (index, inclusive) {
            var offset = [].indexOf.call(this.parent.domNode.childNodes, this.domNode);
            if (index > 0)
                offset += 1;
            return [this.parent.domNode, offset];
        };
        LeafBlot.prototype.value = function () {
            var _a;
            return _a = {}, _a[this.statics.blotName] = this.statics.value(this.domNode) || true, _a;
        };
        LeafBlot.scope = Registry.Scope.INLINE_BLOT;
        return LeafBlot;
    }(shadow_1.default));
    exports.default = LeafBlot;


    /***/ }),
    /* 20 */
    /***/ (function(module, exports, __webpack_require__) {

    var equal = __webpack_require__(11);
    var extend = __webpack_require__(3);


    var lib = {
      attributes: {
        compose: function (a, b, keepNull) {
          if (typeof a !== 'object') a = {};
          if (typeof b !== 'object') b = {};
          var attributes = extend(true, {}, b);
          if (!keepNull) {
            attributes = Object.keys(attributes).reduce(function (copy, key) {
              if (attributes[key] != null) {
                copy[key] = attributes[key];
              }
              return copy;
            }, {});
          }
          for (var key in a) {
            if (a[key] !== undefined && b[key] === undefined) {
              attributes[key] = a[key];
            }
          }
          return Object.keys(attributes).length > 0 ? attributes : undefined;
        },

        diff: function(a, b) {
          if (typeof a !== 'object') a = {};
          if (typeof b !== 'object') b = {};
          var attributes = Object.keys(a).concat(Object.keys(b)).reduce(function (attributes, key) {
            if (!equal(a[key], b[key])) {
              attributes[key] = b[key] === undefined ? null : b[key];
            }
            return attributes;
          }, {});
          return Object.keys(attributes).length > 0 ? attributes : undefined;
        },

        transform: function (a, b, priority) {
          if (typeof a !== 'object') return b;
          if (typeof b !== 'object') return undefined;
          if (!priority) return b;  // b simply overwrites us without priority
          var attributes = Object.keys(b).reduce(function (attributes, key) {
            if (a[key] === undefined) attributes[key] = b[key];  // null is a valid value
            return attributes;
          }, {});
          return Object.keys(attributes).length > 0 ? attributes : undefined;
        }
      },

      iterator: function (ops) {
        return new Iterator(ops);
      },

      length: function (op) {
        if (typeof op['delete'] === 'number') {
          return op['delete'];
        } else if (typeof op.retain === 'number') {
          return op.retain;
        } else {
          return typeof op.insert === 'string' ? op.insert.length : 1;
        }
      }
    };


    function Iterator(ops) {
      this.ops = ops;
      this.index = 0;
      this.offset = 0;
    }
    Iterator.prototype.hasNext = function () {
      return this.peekLength() < Infinity;
    };

    Iterator.prototype.next = function (length) {
      if (!length) length = Infinity;
      var nextOp = this.ops[this.index];
      if (nextOp) {
        var offset = this.offset;
        var opLength = lib.length(nextOp);
        if (length >= opLength - offset) {
          length = opLength - offset;
          this.index += 1;
          this.offset = 0;
        } else {
          this.offset += length;
        }
        if (typeof nextOp['delete'] === 'number') {
          return { 'delete': length };
        } else {
          var retOp = {};
          if (nextOp.attributes) {
            retOp.attributes = nextOp.attributes;
          }
          if (typeof nextOp.retain === 'number') {
            retOp.retain = length;
          } else if (typeof nextOp.insert === 'string') {
            retOp.insert = nextOp.insert.substr(offset, length);
          } else {
            // offset should === 0, length should === 1
            retOp.insert = nextOp.insert;
          }
          return retOp;
        }
      } else {
        return { retain: Infinity };
      }
    };

    Iterator.prototype.peek = function () {
      return this.ops[this.index];
    };

    Iterator.prototype.peekLength = function () {
      if (this.ops[this.index]) {
        // Should never return 0 if our index is being managed correctly
        return lib.length(this.ops[this.index]) - this.offset;
      } else {
        return Infinity;
      }
    };

    Iterator.prototype.peekType = function () {
      if (this.ops[this.index]) {
        if (typeof this.ops[this.index]['delete'] === 'number') {
          return 'delete';
        } else if (typeof this.ops[this.index].retain === 'number') {
          return 'retain';
        } else {
          return 'insert';
        }
      }
      return 'retain';
    };

    Iterator.prototype.rest = function () {
      if (!this.hasNext()) {
        return [];
      } else if (this.offset === 0) {
        return this.ops.slice(this.index);
      } else {
        var offset = this.offset;
        var index = this.index;
        var next = this.next();
        var rest = this.ops.slice(this.index);
        this.offset = offset;
        this.index = index;
        return [next].concat(rest);
      }
    };


    module.exports = lib;


    /***/ }),
    /* 21 */
    /***/ (function(module, exports) {

    var clone = (function() {

    function _instanceof(obj, type) {
      return type != null && obj instanceof type;
    }

    var nativeMap;
    try {
      nativeMap = Map;
    } catch(_) {
      // maybe a reference error because no `Map`. Give it a dummy value that no
      // value will ever be an instanceof.
      nativeMap = function() {};
    }

    var nativeSet;
    try {
      nativeSet = Set;
    } catch(_) {
      nativeSet = function() {};
    }

    var nativePromise;
    try {
      nativePromise = Promise;
    } catch(_) {
      nativePromise = function() {};
    }

    /**
     * Clones (copies) an Object using deep copying.
     *
     * This function supports circular references by default, but if you are certain
     * there are no circular references in your object, you can save some CPU time
     * by calling clone(obj, false).
     *
     * Caution: if `circular` is false and `parent` contains circular references,
     * your program may enter an infinite loop and crash.
     *
     * @param `parent` - the object to be cloned
     * @param `circular` - set to true if the object to be cloned may contain
     *    circular references. (optional - true by default)
     * @param `depth` - set to a number if the object is only to be cloned to
     *    a particular depth. (optional - defaults to Infinity)
     * @param `prototype` - sets the prototype to be used when cloning an object.
     *    (optional - defaults to parent prototype).
     * @param `includeNonEnumerable` - set to true if the non-enumerable properties
     *    should be cloned as well. Non-enumerable properties on the prototype
     *    chain will be ignored. (optional - false by default)
    */
    function clone(parent, circular, depth, prototype, includeNonEnumerable) {
      if (typeof circular === 'object') {
        depth = circular.depth;
        prototype = circular.prototype;
        includeNonEnumerable = circular.includeNonEnumerable;
        circular = circular.circular;
      }
      // maintain two arrays for circular references, where corresponding parents
      // and children have the same index
      var allParents = [];
      var allChildren = [];

      var useBuffer = typeof Buffer != 'undefined';

      if (typeof circular == 'undefined')
        circular = true;

      if (typeof depth == 'undefined')
        depth = Infinity;

      // recurse this function so we don't reset allParents and allChildren
      function _clone(parent, depth) {
        // cloning null always returns null
        if (parent === null)
          return null;

        if (depth === 0)
          return parent;

        var child;
        var proto;
        if (typeof parent != 'object') {
          return parent;
        }

        if (_instanceof(parent, nativeMap)) {
          child = new nativeMap();
        } else if (_instanceof(parent, nativeSet)) {
          child = new nativeSet();
        } else if (_instanceof(parent, nativePromise)) {
          child = new nativePromise(function (resolve, reject) {
            parent.then(function(value) {
              resolve(_clone(value, depth - 1));
            }, function(err) {
              reject(_clone(err, depth - 1));
            });
          });
        } else if (clone.__isArray(parent)) {
          child = [];
        } else if (clone.__isRegExp(parent)) {
          child = new RegExp(parent.source, __getRegExpFlags(parent));
          if (parent.lastIndex) child.lastIndex = parent.lastIndex;
        } else if (clone.__isDate(parent)) {
          child = new Date(parent.getTime());
        } else if (useBuffer && isBuffer(parent)) {
          if (Buffer.allocUnsafe) {
            // Node.js >= 4.5.0
            child = Buffer.allocUnsafe(parent.length);
          } else {
            // Older Node.js versions
            child = new Buffer(parent.length);
          }
          parent.copy(child);
          return child;
        } else if (_instanceof(parent, Error)) {
          child = Object.create(parent);
        } else {
          if (typeof prototype == 'undefined') {
            proto = Object.getPrototypeOf(parent);
            child = Object.create(proto);
          }
          else {
            child = Object.create(prototype);
            proto = prototype;
          }
        }

        if (circular) {
          var index = allParents.indexOf(parent);

          if (index != -1) {
            return allChildren[index];
          }
          allParents.push(parent);
          allChildren.push(child);
        }

        if (_instanceof(parent, nativeMap)) {
          parent.forEach(function(value, key) {
            var keyChild = _clone(key, depth - 1);
            var valueChild = _clone(value, depth - 1);
            child.set(keyChild, valueChild);
          });
        }
        if (_instanceof(parent, nativeSet)) {
          parent.forEach(function(value) {
            var entryChild = _clone(value, depth - 1);
            child.add(entryChild);
          });
        }

        for (var i in parent) {
          var attrs;
          if (proto) {
            attrs = Object.getOwnPropertyDescriptor(proto, i);
          }

          if (attrs && attrs.set == null) {
            continue;
          }
          child[i] = _clone(parent[i], depth - 1);
        }

        if (Object.getOwnPropertySymbols) {
          var symbols = Object.getOwnPropertySymbols(parent);
          for (var i = 0; i < symbols.length; i++) {
            // Don't need to worry about cloning a symbol because it is a primitive,
            // like a number or string.
            var symbol = symbols[i];
            var descriptor = Object.getOwnPropertyDescriptor(parent, symbol);
            if (descriptor && !descriptor.enumerable && !includeNonEnumerable) {
              continue;
            }
            child[symbol] = _clone(parent[symbol], depth - 1);
            if (!descriptor.enumerable) {
              Object.defineProperty(child, symbol, {
                enumerable: false
              });
            }
          }
        }

        if (includeNonEnumerable) {
          var allPropertyNames = Object.getOwnPropertyNames(parent);
          for (var i = 0; i < allPropertyNames.length; i++) {
            var propertyName = allPropertyNames[i];
            var descriptor = Object.getOwnPropertyDescriptor(parent, propertyName);
            if (descriptor && descriptor.enumerable) {
              continue;
            }
            child[propertyName] = _clone(parent[propertyName], depth - 1);
            Object.defineProperty(child, propertyName, {
              enumerable: false
            });
          }
        }

        return child;
      }

      return _clone(parent, depth);
    }

    /**
     * Simple flat clone using prototype, accepts only objects, usefull for property
     * override on FLAT configuration object (no nested props).
     *
     * USE WITH CAUTION! This may not behave as you wish if you do not know how this
     * works.
     */
    clone.clonePrototype = function clonePrototype(parent) {
      if (parent === null)
        return null;

      var c = function () {};
      c.prototype = parent;
      return new c();
    };

    // private utility functions

    function __objToStr(o) {
      return Object.prototype.toString.call(o);
    }
    clone.__objToStr = __objToStr;

    function __isDate(o) {
      return typeof o === 'object' && __objToStr(o) === '[object Date]';
    }
    clone.__isDate = __isDate;

    function __isArray(o) {
      return typeof o === 'object' && __objToStr(o) === '[object Array]';
    }
    clone.__isArray = __isArray;

    function __isRegExp(o) {
      return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
    }
    clone.__isRegExp = __isRegExp;

    function __getRegExpFlags(re) {
      var flags = '';
      if (re.global) flags += 'g';
      if (re.ignoreCase) flags += 'i';
      if (re.multiline) flags += 'm';
      return flags;
    }
    clone.__getRegExpFlags = __getRegExpFlags;

    return clone;
    })();

    if (typeof module === 'object' && module.exports) {
      module.exports = clone;
    }


    /***/ }),
    /* 22 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _emitter = __webpack_require__(8);

    var _emitter2 = _interopRequireDefault(_emitter);

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    var _break = __webpack_require__(16);

    var _break2 = _interopRequireDefault(_break);

    var _code = __webpack_require__(13);

    var _code2 = _interopRequireDefault(_code);

    var _container = __webpack_require__(25);

    var _container2 = _interopRequireDefault(_container);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    function isLine(blot) {
      return blot instanceof _block2.default || blot instanceof _block.BlockEmbed;
    }

    var Scroll = function (_Parchment$Scroll) {
      _inherits(Scroll, _Parchment$Scroll);

      function Scroll(domNode, config) {
        _classCallCheck(this, Scroll);

        var _this = _possibleConstructorReturn(this, (Scroll.__proto__ || Object.getPrototypeOf(Scroll)).call(this, domNode));

        _this.emitter = config.emitter;
        if (Array.isArray(config.whitelist)) {
          _this.whitelist = config.whitelist.reduce(function (whitelist, format) {
            whitelist[format] = true;
            return whitelist;
          }, {});
        }
        // Some reason fixes composition issues with character languages in Windows/Chrome, Safari
        _this.domNode.addEventListener('DOMNodeInserted', function () {});
        _this.optimize();
        _this.enable();
        return _this;
      }

      _createClass(Scroll, [{
        key: 'batchStart',
        value: function batchStart() {
          this.batch = true;
        }
      }, {
        key: 'batchEnd',
        value: function batchEnd() {
          this.batch = false;
          this.optimize();
        }
      }, {
        key: 'deleteAt',
        value: function deleteAt(index, length) {
          var _line = this.line(index),
              _line2 = _slicedToArray(_line, 2),
              first = _line2[0],
              offset = _line2[1];

          var _line3 = this.line(index + length),
              _line4 = _slicedToArray(_line3, 1),
              last = _line4[0];

          _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'deleteAt', this).call(this, index, length);
          if (last != null && first !== last && offset > 0) {
            if (first instanceof _block.BlockEmbed || last instanceof _block.BlockEmbed) {
              this.optimize();
              return;
            }
            if (first instanceof _code2.default) {
              var newlineIndex = first.newlineIndex(first.length(), true);
              if (newlineIndex > -1) {
                first = first.split(newlineIndex + 1);
                if (first === last) {
                  this.optimize();
                  return;
                }
              }
            } else if (last instanceof _code2.default) {
              var _newlineIndex = last.newlineIndex(0);
              if (_newlineIndex > -1) {
                last.split(_newlineIndex + 1);
              }
            }
            var ref = last.children.head instanceof _break2.default ? null : last.children.head;
            first.moveChildren(last, ref);
            first.remove();
          }
          this.optimize();
        }
      }, {
        key: 'enable',
        value: function enable() {
          var enabled = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

          this.domNode.setAttribute('contenteditable', enabled);
        }
      }, {
        key: 'formatAt',
        value: function formatAt(index, length, format, value) {
          if (this.whitelist != null && !this.whitelist[format]) return;
          _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'formatAt', this).call(this, index, length, format, value);
          this.optimize();
        }
      }, {
        key: 'insertAt',
        value: function insertAt(index, value, def) {
          if (def != null && this.whitelist != null && !this.whitelist[value]) return;
          if (index >= this.length()) {
            if (def == null || _parchment2.default.query(value, _parchment2.default.Scope.BLOCK) == null) {
              var blot = _parchment2.default.create(this.statics.defaultChild);
              this.appendChild(blot);
              if (def == null && value.endsWith('\n')) {
                value = value.slice(0, -1);
              }
              blot.insertAt(0, value, def);
            } else {
              var embed = _parchment2.default.create(value, def);
              this.appendChild(embed);
            }
          } else {
            _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'insertAt', this).call(this, index, value, def);
          }
          this.optimize();
        }
      }, {
        key: 'insertBefore',
        value: function insertBefore(blot, ref) {
          if (blot.statics.scope === _parchment2.default.Scope.INLINE_BLOT) {
            var wrapper = _parchment2.default.create(this.statics.defaultChild);
            wrapper.appendChild(blot);
            blot = wrapper;
          }
          _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'insertBefore', this).call(this, blot, ref);
        }
      }, {
        key: 'leaf',
        value: function leaf(index) {
          return this.path(index).pop() || [null, -1];
        }
      }, {
        key: 'line',
        value: function line(index) {
          if (index === this.length()) {
            return this.line(index - 1);
          }
          return this.descendant(isLine, index);
        }
      }, {
        key: 'lines',
        value: function lines() {
          var index = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
          var length = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Number.MAX_VALUE;

          var getLines = function getLines(blot, index, length) {
            var lines = [],
                lengthLeft = length;
            blot.children.forEachAt(index, length, function (child, index, length) {
              if (isLine(child)) {
                lines.push(child);
              } else if (child instanceof _parchment2.default.Container) {
                lines = lines.concat(getLines(child, index, lengthLeft));
              }
              lengthLeft -= length;
            });
            return lines;
          };
          return getLines(this, index, length);
        }
      }, {
        key: 'optimize',
        value: function optimize() {
          var mutations = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
          var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

          if (this.batch === true) return;
          _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'optimize', this).call(this, mutations, context);
          if (mutations.length > 0) {
            this.emitter.emit(_emitter2.default.events.SCROLL_OPTIMIZE, mutations, context);
          }
        }
      }, {
        key: 'path',
        value: function path(index) {
          return _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'path', this).call(this, index).slice(1); // Exclude self
        }
      }, {
        key: 'update',
        value: function update(mutations) {
          if (this.batch === true) return;
          var source = _emitter2.default.sources.USER;
          if (typeof mutations === 'string') {
            source = mutations;
          }
          if (!Array.isArray(mutations)) {
            mutations = this.observer.takeRecords();
          }
          if (mutations.length > 0) {
            this.emitter.emit(_emitter2.default.events.SCROLL_BEFORE_UPDATE, source, mutations);
          }
          _get(Scroll.prototype.__proto__ || Object.getPrototypeOf(Scroll.prototype), 'update', this).call(this, mutations.concat([])); // pass copy
          if (mutations.length > 0) {
            this.emitter.emit(_emitter2.default.events.SCROLL_UPDATE, source, mutations);
          }
        }
      }]);

      return Scroll;
    }(_parchment2.default.Scroll);

    Scroll.blotName = 'scroll';
    Scroll.className = 'ql-editor';
    Scroll.tagName = 'DIV';
    Scroll.defaultChild = 'block';
    Scroll.allowedChildren = [_block2.default, _block.BlockEmbed, _container2.default];

    exports.default = Scroll;

    /***/ }),
    /* 23 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.SHORTKEY = exports.default = undefined;

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _clone = __webpack_require__(21);

    var _clone2 = _interopRequireDefault(_clone);

    var _deepEqual = __webpack_require__(11);

    var _deepEqual2 = _interopRequireDefault(_deepEqual);

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _op = __webpack_require__(20);

    var _op2 = _interopRequireDefault(_op);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _logger = __webpack_require__(10);

    var _logger2 = _interopRequireDefault(_logger);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var debug = (0, _logger2.default)('quill:keyboard');

    var SHORTKEY = /Mac/i.test(navigator.platform) ? 'metaKey' : 'ctrlKey';

    var Keyboard = function (_Module) {
      _inherits(Keyboard, _Module);

      _createClass(Keyboard, null, [{
        key: 'match',
        value: function match(evt, binding) {
          binding = normalize(binding);
          if (['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].some(function (key) {
            return !!binding[key] !== evt[key] && binding[key] !== null;
          })) {
            return false;
          }
          return binding.key === (evt.which || evt.keyCode);
        }
      }]);

      function Keyboard(quill, options) {
        _classCallCheck(this, Keyboard);

        var _this = _possibleConstructorReturn(this, (Keyboard.__proto__ || Object.getPrototypeOf(Keyboard)).call(this, quill, options));

        _this.bindings = {};
        Object.keys(_this.options.bindings).forEach(function (name) {
          if (name === 'list autofill' && quill.scroll.whitelist != null && !quill.scroll.whitelist['list']) {
            return;
          }
          if (_this.options.bindings[name]) {
            _this.addBinding(_this.options.bindings[name]);
          }
        });
        _this.addBinding({ key: Keyboard.keys.ENTER, shiftKey: null }, handleEnter);
        _this.addBinding({ key: Keyboard.keys.ENTER, metaKey: null, ctrlKey: null, altKey: null }, function () {});
        if (/Firefox/i.test(navigator.userAgent)) {
          // Need to handle delete and backspace for Firefox in the general case #1171
          _this.addBinding({ key: Keyboard.keys.BACKSPACE }, { collapsed: true }, handleBackspace);
          _this.addBinding({ key: Keyboard.keys.DELETE }, { collapsed: true }, handleDelete);
        } else {
          _this.addBinding({ key: Keyboard.keys.BACKSPACE }, { collapsed: true, prefix: /^.?$/ }, handleBackspace);
          _this.addBinding({ key: Keyboard.keys.DELETE }, { collapsed: true, suffix: /^.?$/ }, handleDelete);
        }
        _this.addBinding({ key: Keyboard.keys.BACKSPACE }, { collapsed: false }, handleDeleteRange);
        _this.addBinding({ key: Keyboard.keys.DELETE }, { collapsed: false }, handleDeleteRange);
        _this.addBinding({ key: Keyboard.keys.BACKSPACE, altKey: null, ctrlKey: null, metaKey: null, shiftKey: null }, { collapsed: true, offset: 0 }, handleBackspace);
        _this.listen();
        return _this;
      }

      _createClass(Keyboard, [{
        key: 'addBinding',
        value: function addBinding(key) {
          var context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          var handler = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

          var binding = normalize(key);
          if (binding == null || binding.key == null) {
            return debug.warn('Attempted to add invalid keyboard binding', binding);
          }
          if (typeof context === 'function') {
            context = { handler: context };
          }
          if (typeof handler === 'function') {
            handler = { handler: handler };
          }
          binding = (0, _extend2.default)(binding, context, handler);
          this.bindings[binding.key] = this.bindings[binding.key] || [];
          this.bindings[binding.key].push(binding);
        }
      }, {
        key: 'listen',
        value: function listen() {
          var _this2 = this;

          this.quill.root.addEventListener('keydown', function (evt) {
            if (evt.defaultPrevented) return;
            var which = evt.which || evt.keyCode;
            var bindings = (_this2.bindings[which] || []).filter(function (binding) {
              return Keyboard.match(evt, binding);
            });
            if (bindings.length === 0) return;
            var range = _this2.quill.getSelection();
            if (range == null || !_this2.quill.hasFocus()) return;

            var _quill$getLine = _this2.quill.getLine(range.index),
                _quill$getLine2 = _slicedToArray(_quill$getLine, 2),
                line = _quill$getLine2[0],
                offset = _quill$getLine2[1];

            var _quill$getLeaf = _this2.quill.getLeaf(range.index),
                _quill$getLeaf2 = _slicedToArray(_quill$getLeaf, 2),
                leafStart = _quill$getLeaf2[0],
                offsetStart = _quill$getLeaf2[1];

            var _ref = range.length === 0 ? [leafStart, offsetStart] : _this2.quill.getLeaf(range.index + range.length),
                _ref2 = _slicedToArray(_ref, 2),
                leafEnd = _ref2[0],
                offsetEnd = _ref2[1];

            var prefixText = leafStart instanceof _parchment2.default.Text ? leafStart.value().slice(0, offsetStart) : '';
            var suffixText = leafEnd instanceof _parchment2.default.Text ? leafEnd.value().slice(offsetEnd) : '';
            var curContext = {
              collapsed: range.length === 0,
              empty: range.length === 0 && line.length() <= 1,
              format: _this2.quill.getFormat(range),
              offset: offset,
              prefix: prefixText,
              suffix: suffixText
            };
            var prevented = bindings.some(function (binding) {
              if (binding.collapsed != null && binding.collapsed !== curContext.collapsed) return false;
              if (binding.empty != null && binding.empty !== curContext.empty) return false;
              if (binding.offset != null && binding.offset !== curContext.offset) return false;
              if (Array.isArray(binding.format)) {
                // any format is present
                if (binding.format.every(function (name) {
                  return curContext.format[name] == null;
                })) {
                  return false;
                }
              } else if (_typeof(binding.format) === 'object') {
                // all formats must match
                if (!Object.keys(binding.format).every(function (name) {
                  if (binding.format[name] === true) return curContext.format[name] != null;
                  if (binding.format[name] === false) return curContext.format[name] == null;
                  return (0, _deepEqual2.default)(binding.format[name], curContext.format[name]);
                })) {
                  return false;
                }
              }
              if (binding.prefix != null && !binding.prefix.test(curContext.prefix)) return false;
              if (binding.suffix != null && !binding.suffix.test(curContext.suffix)) return false;
              return binding.handler.call(_this2, range, curContext) !== true;
            });
            if (prevented) {
              evt.preventDefault();
            }
          });
        }
      }]);

      return Keyboard;
    }(_module2.default);

    Keyboard.keys = {
      BACKSPACE: 8,
      TAB: 9,
      ENTER: 13,
      ESCAPE: 27,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      DELETE: 46
    };

    Keyboard.DEFAULTS = {
      bindings: {
        'bold': makeFormatHandler('bold'),
        'italic': makeFormatHandler('italic'),
        'underline': makeFormatHandler('underline'),
        'indent': {
          // highlight tab or tab at beginning of list, indent or blockquote
          key: Keyboard.keys.TAB,
          format: ['blockquote', 'indent', 'list'],
          handler: function handler(range, context) {
            if (context.collapsed && context.offset !== 0) return true;
            this.quill.format('indent', '+1', _quill2.default.sources.USER);
          }
        },
        'outdent': {
          key: Keyboard.keys.TAB,
          shiftKey: true,
          format: ['blockquote', 'indent', 'list'],
          // highlight tab or tab at beginning of list, indent or blockquote
          handler: function handler(range, context) {
            if (context.collapsed && context.offset !== 0) return true;
            this.quill.format('indent', '-1', _quill2.default.sources.USER);
          }
        },
        'outdent backspace': {
          key: Keyboard.keys.BACKSPACE,
          collapsed: true,
          shiftKey: null,
          metaKey: null,
          ctrlKey: null,
          altKey: null,
          format: ['indent', 'list'],
          offset: 0,
          handler: function handler(range, context) {
            if (context.format.indent != null) {
              this.quill.format('indent', '-1', _quill2.default.sources.USER);
            } else if (context.format.list != null) {
              this.quill.format('list', false, _quill2.default.sources.USER);
            }
          }
        },
        'indent code-block': makeCodeBlockHandler(true),
        'outdent code-block': makeCodeBlockHandler(false),
        'remove tab': {
          key: Keyboard.keys.TAB,
          shiftKey: true,
          collapsed: true,
          prefix: /\t$/,
          handler: function handler(range) {
            this.quill.deleteText(range.index - 1, 1, _quill2.default.sources.USER);
          }
        },
        'tab': {
          key: Keyboard.keys.TAB,
          handler: function handler(range) {
            this.quill.history.cutoff();
            var delta = new _quillDelta2.default().retain(range.index).delete(range.length).insert('\t');
            this.quill.updateContents(delta, _quill2.default.sources.USER);
            this.quill.history.cutoff();
            this.quill.setSelection(range.index + 1, _quill2.default.sources.SILENT);
          }
        },
        'list empty enter': {
          key: Keyboard.keys.ENTER,
          collapsed: true,
          format: ['list'],
          empty: true,
          handler: function handler(range, context) {
            this.quill.format('list', false, _quill2.default.sources.USER);
            if (context.format.indent) {
              this.quill.format('indent', false, _quill2.default.sources.USER);
            }
          }
        },
        'checklist enter': {
          key: Keyboard.keys.ENTER,
          collapsed: true,
          format: { list: 'checked' },
          handler: function handler(range) {
            var _quill$getLine3 = this.quill.getLine(range.index),
                _quill$getLine4 = _slicedToArray(_quill$getLine3, 2),
                line = _quill$getLine4[0],
                offset = _quill$getLine4[1];

            var formats = (0, _extend2.default)({}, line.formats(), { list: 'checked' });
            var delta = new _quillDelta2.default().retain(range.index).insert('\n', formats).retain(line.length() - offset - 1).retain(1, { list: 'unchecked' });
            this.quill.updateContents(delta, _quill2.default.sources.USER);
            this.quill.setSelection(range.index + 1, _quill2.default.sources.SILENT);
            this.quill.scrollIntoView();
          }
        },
        'header enter': {
          key: Keyboard.keys.ENTER,
          collapsed: true,
          format: ['header'],
          suffix: /^$/,
          handler: function handler(range, context) {
            var _quill$getLine5 = this.quill.getLine(range.index),
                _quill$getLine6 = _slicedToArray(_quill$getLine5, 2),
                line = _quill$getLine6[0],
                offset = _quill$getLine6[1];

            var delta = new _quillDelta2.default().retain(range.index).insert('\n', context.format).retain(line.length() - offset - 1).retain(1, { header: null });
            this.quill.updateContents(delta, _quill2.default.sources.USER);
            this.quill.setSelection(range.index + 1, _quill2.default.sources.SILENT);
            this.quill.scrollIntoView();
          }
        },
        'list autofill': {
          key: ' ',
          collapsed: true,
          format: { list: false },
          prefix: /^\s*?(\d+\.|-|\*|\[ ?\]|\[x\])$/,
          handler: function handler(range, context) {
            var length = context.prefix.length;

            var _quill$getLine7 = this.quill.getLine(range.index),
                _quill$getLine8 = _slicedToArray(_quill$getLine7, 2),
                line = _quill$getLine8[0],
                offset = _quill$getLine8[1];

            if (offset > length) return true;
            var value = void 0;
            switch (context.prefix.trim()) {
              case '[]':case '[ ]':
                value = 'unchecked';
                break;
              case '[x]':
                value = 'checked';
                break;
              case '-':case '*':
                value = 'bullet';
                break;
              default:
                value = 'ordered';
            }
            this.quill.insertText(range.index, ' ', _quill2.default.sources.USER);
            this.quill.history.cutoff();
            var delta = new _quillDelta2.default().retain(range.index - offset).delete(length + 1).retain(line.length() - 2 - offset).retain(1, { list: value });
            this.quill.updateContents(delta, _quill2.default.sources.USER);
            this.quill.history.cutoff();
            this.quill.setSelection(range.index - length, _quill2.default.sources.SILENT);
          }
        },
        'code exit': {
          key: Keyboard.keys.ENTER,
          collapsed: true,
          format: ['code-block'],
          prefix: /\n\n$/,
          suffix: /^\s+$/,
          handler: function handler(range) {
            var _quill$getLine9 = this.quill.getLine(range.index),
                _quill$getLine10 = _slicedToArray(_quill$getLine9, 2),
                line = _quill$getLine10[0],
                offset = _quill$getLine10[1];

            var delta = new _quillDelta2.default().retain(range.index + line.length() - offset - 2).retain(1, { 'code-block': null }).delete(1);
            this.quill.updateContents(delta, _quill2.default.sources.USER);
          }
        },
        'embed left': makeEmbedArrowHandler(Keyboard.keys.LEFT, false),
        'embed left shift': makeEmbedArrowHandler(Keyboard.keys.LEFT, true),
        'embed right': makeEmbedArrowHandler(Keyboard.keys.RIGHT, false),
        'embed right shift': makeEmbedArrowHandler(Keyboard.keys.RIGHT, true)
      }
    };

    function makeEmbedArrowHandler(key, shiftKey) {
      var _ref3;

      var where = key === Keyboard.keys.LEFT ? 'prefix' : 'suffix';
      return _ref3 = {
        key: key,
        shiftKey: shiftKey,
        altKey: null
      }, _defineProperty(_ref3, where, /^$/), _defineProperty(_ref3, 'handler', function handler(range) {
        var index = range.index;
        if (key === Keyboard.keys.RIGHT) {
          index += range.length + 1;
        }

        var _quill$getLeaf3 = this.quill.getLeaf(index),
            _quill$getLeaf4 = _slicedToArray(_quill$getLeaf3, 1),
            leaf = _quill$getLeaf4[0];

        if (!(leaf instanceof _parchment2.default.Embed)) return true;
        if (key === Keyboard.keys.LEFT) {
          if (shiftKey) {
            this.quill.setSelection(range.index - 1, range.length + 1, _quill2.default.sources.USER);
          } else {
            this.quill.setSelection(range.index - 1, _quill2.default.sources.USER);
          }
        } else {
          if (shiftKey) {
            this.quill.setSelection(range.index, range.length + 1, _quill2.default.sources.USER);
          } else {
            this.quill.setSelection(range.index + range.length + 1, _quill2.default.sources.USER);
          }
        }
        return false;
      }), _ref3;
    }

    function handleBackspace(range, context) {
      if (range.index === 0 || this.quill.getLength() <= 1) return;

      var _quill$getLine11 = this.quill.getLine(range.index),
          _quill$getLine12 = _slicedToArray(_quill$getLine11, 1),
          line = _quill$getLine12[0];

      var formats = {};
      if (context.offset === 0) {
        var _quill$getLine13 = this.quill.getLine(range.index - 1),
            _quill$getLine14 = _slicedToArray(_quill$getLine13, 1),
            prev = _quill$getLine14[0];

        if (prev != null && prev.length() > 1) {
          var curFormats = line.formats();
          var prevFormats = this.quill.getFormat(range.index - 1, 1);
          formats = _op2.default.attributes.diff(curFormats, prevFormats) || {};
        }
      }
      // Check for astral symbols
      var length = /[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(context.prefix) ? 2 : 1;
      this.quill.deleteText(range.index - length, length, _quill2.default.sources.USER);
      if (Object.keys(formats).length > 0) {
        this.quill.formatLine(range.index - length, length, formats, _quill2.default.sources.USER);
      }
      this.quill.focus();
    }

    function handleDelete(range, context) {
      // Check for astral symbols
      var length = /^[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(context.suffix) ? 2 : 1;
      if (range.index >= this.quill.getLength() - length) return;
      var formats = {},
          nextLength = 0;

      var _quill$getLine15 = this.quill.getLine(range.index),
          _quill$getLine16 = _slicedToArray(_quill$getLine15, 1),
          line = _quill$getLine16[0];

      if (context.offset >= line.length() - 1) {
        var _quill$getLine17 = this.quill.getLine(range.index + 1),
            _quill$getLine18 = _slicedToArray(_quill$getLine17, 1),
            next = _quill$getLine18[0];

        if (next) {
          var curFormats = line.formats();
          var nextFormats = this.quill.getFormat(range.index, 1);
          formats = _op2.default.attributes.diff(curFormats, nextFormats) || {};
          nextLength = next.length();
        }
      }
      this.quill.deleteText(range.index, length, _quill2.default.sources.USER);
      if (Object.keys(formats).length > 0) {
        this.quill.formatLine(range.index + nextLength - 1, length, formats, _quill2.default.sources.USER);
      }
    }

    function handleDeleteRange(range) {
      var lines = this.quill.getLines(range);
      var formats = {};
      if (lines.length > 1) {
        var firstFormats = lines[0].formats();
        var lastFormats = lines[lines.length - 1].formats();
        formats = _op2.default.attributes.diff(lastFormats, firstFormats) || {};
      }
      this.quill.deleteText(range, _quill2.default.sources.USER);
      if (Object.keys(formats).length > 0) {
        this.quill.formatLine(range.index, 1, formats, _quill2.default.sources.USER);
      }
      this.quill.setSelection(range.index, _quill2.default.sources.SILENT);
      this.quill.focus();
    }

    function handleEnter(range, context) {
      var _this3 = this;

      if (range.length > 0) {
        this.quill.scroll.deleteAt(range.index, range.length); // So we do not trigger text-change
      }
      var lineFormats = Object.keys(context.format).reduce(function (lineFormats, format) {
        if (_parchment2.default.query(format, _parchment2.default.Scope.BLOCK) && !Array.isArray(context.format[format])) {
          lineFormats[format] = context.format[format];
        }
        return lineFormats;
      }, {});
      this.quill.insertText(range.index, '\n', lineFormats, _quill2.default.sources.USER);
      // Earlier scroll.deleteAt might have messed up our selection,
      // so insertText's built in selection preservation is not reliable
      this.quill.setSelection(range.index + 1, _quill2.default.sources.SILENT);
      this.quill.focus();
      Object.keys(context.format).forEach(function (name) {
        if (lineFormats[name] != null) return;
        if (Array.isArray(context.format[name])) return;
        if (name === 'link') return;
        _this3.quill.format(name, context.format[name], _quill2.default.sources.USER);
      });
    }

    function makeCodeBlockHandler(indent) {
      return {
        key: Keyboard.keys.TAB,
        shiftKey: !indent,
        format: { 'code-block': true },
        handler: function handler(range) {
          var CodeBlock = _parchment2.default.query('code-block');
          var index = range.index,
              length = range.length;

          var _quill$scroll$descend = this.quill.scroll.descendant(CodeBlock, index),
              _quill$scroll$descend2 = _slicedToArray(_quill$scroll$descend, 2),
              block = _quill$scroll$descend2[0],
              offset = _quill$scroll$descend2[1];

          if (block == null) return;
          var scrollIndex = this.quill.getIndex(block);
          var start = block.newlineIndex(offset, true) + 1;
          var end = block.newlineIndex(scrollIndex + offset + length);
          var lines = block.domNode.textContent.slice(start, end).split('\n');
          offset = 0;
          lines.forEach(function (line, i) {
            if (indent) {
              block.insertAt(start + offset, CodeBlock.TAB);
              offset += CodeBlock.TAB.length;
              if (i === 0) {
                index += CodeBlock.TAB.length;
              } else {
                length += CodeBlock.TAB.length;
              }
            } else if (line.startsWith(CodeBlock.TAB)) {
              block.deleteAt(start + offset, CodeBlock.TAB.length);
              offset -= CodeBlock.TAB.length;
              if (i === 0) {
                index -= CodeBlock.TAB.length;
              } else {
                length -= CodeBlock.TAB.length;
              }
            }
            offset += line.length + 1;
          });
          this.quill.update(_quill2.default.sources.USER);
          this.quill.setSelection(index, length, _quill2.default.sources.SILENT);
        }
      };
    }

    function makeFormatHandler(format) {
      return {
        key: format[0].toUpperCase(),
        shortKey: true,
        handler: function handler(range, context) {
          this.quill.format(format, !context.format[format], _quill2.default.sources.USER);
        }
      };
    }

    function normalize(binding) {
      if (typeof binding === 'string' || typeof binding === 'number') {
        return normalize({ key: binding });
      }
      if ((typeof binding === 'undefined' ? 'undefined' : _typeof(binding)) === 'object') {
        binding = (0, _clone2.default)(binding, false);
      }
      if (typeof binding.key === 'string') {
        if (Keyboard.keys[binding.key.toUpperCase()] != null) {
          binding.key = Keyboard.keys[binding.key.toUpperCase()];
        } else if (binding.key.length === 1) {
          binding.key = binding.key.toUpperCase().charCodeAt(0);
        } else {
          return null;
        }
      }
      if (binding.shortKey) {
        binding[SHORTKEY] = binding.shortKey;
        delete binding.shortKey;
      }
      return binding;
    }

    exports.default = Keyboard;
    exports.SHORTKEY = SHORTKEY;

    /***/ }),
    /* 24 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _text = __webpack_require__(7);

    var _text2 = _interopRequireDefault(_text);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Cursor = function (_Parchment$Embed) {
      _inherits(Cursor, _Parchment$Embed);

      _createClass(Cursor, null, [{
        key: 'value',
        value: function value() {
          return undefined;
        }
      }]);

      function Cursor(domNode, selection) {
        _classCallCheck(this, Cursor);

        var _this = _possibleConstructorReturn(this, (Cursor.__proto__ || Object.getPrototypeOf(Cursor)).call(this, domNode));

        _this.selection = selection;
        _this.textNode = document.createTextNode(Cursor.CONTENTS);
        _this.domNode.appendChild(_this.textNode);
        _this._length = 0;
        return _this;
      }

      _createClass(Cursor, [{
        key: 'detach',
        value: function detach() {
          // super.detach() will also clear domNode.__blot
          if (this.parent != null) this.parent.removeChild(this);
        }
      }, {
        key: 'format',
        value: function format(name, value) {
          if (this._length !== 0) {
            return _get(Cursor.prototype.__proto__ || Object.getPrototypeOf(Cursor.prototype), 'format', this).call(this, name, value);
          }
          var target = this,
              index = 0;
          while (target != null && target.statics.scope !== _parchment2.default.Scope.BLOCK_BLOT) {
            index += target.offset(target.parent);
            target = target.parent;
          }
          if (target != null) {
            this._length = Cursor.CONTENTS.length;
            target.optimize();
            target.formatAt(index, Cursor.CONTENTS.length, name, value);
            this._length = 0;
          }
        }
      }, {
        key: 'index',
        value: function index(node, offset) {
          if (node === this.textNode) return 0;
          return _get(Cursor.prototype.__proto__ || Object.getPrototypeOf(Cursor.prototype), 'index', this).call(this, node, offset);
        }
      }, {
        key: 'length',
        value: function length() {
          return this._length;
        }
      }, {
        key: 'position',
        value: function position() {
          return [this.textNode, this.textNode.data.length];
        }
      }, {
        key: 'remove',
        value: function remove() {
          _get(Cursor.prototype.__proto__ || Object.getPrototypeOf(Cursor.prototype), 'remove', this).call(this);
          this.parent = null;
        }
      }, {
        key: 'restore',
        value: function restore() {
          if (this.selection.composing || this.parent == null) return;
          var textNode = this.textNode;
          var range = this.selection.getNativeRange();
          var restoreText = void 0,
              start = void 0,
              end = void 0;
          if (range != null && range.start.node === textNode && range.end.node === textNode) {
            var _ref = [textNode, range.start.offset, range.end.offset];
            restoreText = _ref[0];
            start = _ref[1];
            end = _ref[2];
          }
          // Link format will insert text outside of anchor tag
          while (this.domNode.lastChild != null && this.domNode.lastChild !== this.textNode) {
            this.domNode.parentNode.insertBefore(this.domNode.lastChild, this.domNode);
          }
          if (this.textNode.data !== Cursor.CONTENTS) {
            var text = this.textNode.data.split(Cursor.CONTENTS).join('');
            if (this.next instanceof _text2.default) {
              restoreText = this.next.domNode;
              this.next.insertAt(0, text);
              this.textNode.data = Cursor.CONTENTS;
            } else {
              this.textNode.data = text;
              this.parent.insertBefore(_parchment2.default.create(this.textNode), this);
              this.textNode = document.createTextNode(Cursor.CONTENTS);
              this.domNode.appendChild(this.textNode);
            }
          }
          this.remove();
          if (start != null) {
            var _map = [start, end].map(function (offset) {
              return Math.max(0, Math.min(restoreText.data.length, offset - 1));
            });

            var _map2 = _slicedToArray(_map, 2);

            start = _map2[0];
            end = _map2[1];

            return {
              startNode: restoreText,
              startOffset: start,
              endNode: restoreText,
              endOffset: end
            };
          }
        }
      }, {
        key: 'update',
        value: function update(mutations, context) {
          var _this2 = this;

          if (mutations.some(function (mutation) {
            return mutation.type === 'characterData' && mutation.target === _this2.textNode;
          })) {
            var range = this.restore();
            if (range) context.range = range;
          }
        }
      }, {
        key: 'value',
        value: function value() {
          return '';
        }
      }]);

      return Cursor;
    }(_parchment2.default.Embed);

    Cursor.blotName = 'cursor';
    Cursor.className = 'ql-cursor';
    Cursor.tagName = 'span';
    Cursor.CONTENTS = '\uFEFF'; // Zero width no break space


    exports.default = Cursor;

    /***/ }),
    /* 25 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Container = function (_Parchment$Container) {
      _inherits(Container, _Parchment$Container);

      function Container() {
        _classCallCheck(this, Container);

        return _possibleConstructorReturn(this, (Container.__proto__ || Object.getPrototypeOf(Container)).apply(this, arguments));
      }

      return Container;
    }(_parchment2.default.Container);

    Container.allowedChildren = [_block2.default, _block.BlockEmbed, Container];

    exports.default = Container;

    /***/ }),
    /* 26 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.ColorStyle = exports.ColorClass = exports.ColorAttributor = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var ColorAttributor = function (_Parchment$Attributor) {
      _inherits(ColorAttributor, _Parchment$Attributor);

      function ColorAttributor() {
        _classCallCheck(this, ColorAttributor);

        return _possibleConstructorReturn(this, (ColorAttributor.__proto__ || Object.getPrototypeOf(ColorAttributor)).apply(this, arguments));
      }

      _createClass(ColorAttributor, [{
        key: 'value',
        value: function value(domNode) {
          var value = _get(ColorAttributor.prototype.__proto__ || Object.getPrototypeOf(ColorAttributor.prototype), 'value', this).call(this, domNode);
          if (!value.startsWith('rgb(')) return value;
          value = value.replace(/^[^\d]+/, '').replace(/[^\d]+$/, '');
          return '#' + value.split(',').map(function (component) {
            return ('00' + parseInt(component).toString(16)).slice(-2);
          }).join('');
        }
      }]);

      return ColorAttributor;
    }(_parchment2.default.Attributor.Style);

    var ColorClass = new _parchment2.default.Attributor.Class('color', 'ql-color', {
      scope: _parchment2.default.Scope.INLINE
    });
    var ColorStyle = new ColorAttributor('color', 'color', {
      scope: _parchment2.default.Scope.INLINE
    });

    exports.ColorAttributor = ColorAttributor;
    exports.ColorClass = ColorClass;
    exports.ColorStyle = ColorStyle;

    /***/ }),
    /* 27 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.sanitize = exports.default = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Link = function (_Inline) {
      _inherits(Link, _Inline);

      function Link() {
        _classCallCheck(this, Link);

        return _possibleConstructorReturn(this, (Link.__proto__ || Object.getPrototypeOf(Link)).apply(this, arguments));
      }

      _createClass(Link, [{
        key: 'format',
        value: function format(name, value) {
          if (name !== this.statics.blotName || !value) return _get(Link.prototype.__proto__ || Object.getPrototypeOf(Link.prototype), 'format', this).call(this, name, value);
          value = this.constructor.sanitize(value);
          this.domNode.setAttribute('href', value);
        }
      }], [{
        key: 'create',
        value: function create(value) {
          var node = _get(Link.__proto__ || Object.getPrototypeOf(Link), 'create', this).call(this, value);
          value = this.sanitize(value);
          node.setAttribute('href', value);
          node.setAttribute('rel', 'noopener noreferrer');
          node.setAttribute('target', '_blank');
          return node;
        }
      }, {
        key: 'formats',
        value: function formats(domNode) {
          return domNode.getAttribute('href');
        }
      }, {
        key: 'sanitize',
        value: function sanitize(url) {
          return _sanitize(url, this.PROTOCOL_WHITELIST) ? url : this.SANITIZED_URL;
        }
      }]);

      return Link;
    }(_inline2.default);

    Link.blotName = 'link';
    Link.tagName = 'A';
    Link.SANITIZED_URL = 'about:blank';
    Link.PROTOCOL_WHITELIST = ['http', 'https', 'mailto', 'tel'];

    function _sanitize(url, protocols) {
      var anchor = document.createElement('a');
      anchor.href = url;
      var protocol = anchor.href.slice(0, anchor.href.indexOf(':'));
      return protocols.indexOf(protocol) > -1;
    }

    exports.default = Link;
    exports.sanitize = _sanitize;

    /***/ }),
    /* 28 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _keyboard = __webpack_require__(23);

    var _keyboard2 = _interopRequireDefault(_keyboard);

    var _dropdown = __webpack_require__(107);

    var _dropdown2 = _interopRequireDefault(_dropdown);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var optionsCounter = 0;

    function toggleAriaAttribute(element, attribute) {
      element.setAttribute(attribute, !(element.getAttribute(attribute) === 'true'));
    }

    var Picker = function () {
      function Picker(select) {
        var _this = this;

        _classCallCheck(this, Picker);

        this.select = select;
        this.container = document.createElement('span');
        this.buildPicker();
        this.select.style.display = 'none';
        this.select.parentNode.insertBefore(this.container, this.select);

        this.label.addEventListener('mousedown', function () {
          _this.togglePicker();
        });
        this.label.addEventListener('keydown', function (event) {
          switch (event.keyCode) {
            // Allows the "Enter" key to open the picker
            case _keyboard2.default.keys.ENTER:
              _this.togglePicker();
              break;

            // Allows the "Escape" key to close the picker
            case _keyboard2.default.keys.ESCAPE:
              _this.escape();
              event.preventDefault();
              break;
          }
        });
        this.select.addEventListener('change', this.update.bind(this));
      }

      _createClass(Picker, [{
        key: 'togglePicker',
        value: function togglePicker() {
          this.container.classList.toggle('ql-expanded');
          // Toggle aria-expanded and aria-hidden to make the picker accessible
          toggleAriaAttribute(this.label, 'aria-expanded');
          toggleAriaAttribute(this.options, 'aria-hidden');
        }
      }, {
        key: 'buildItem',
        value: function buildItem(option) {
          var _this2 = this;

          var item = document.createElement('span');
          item.tabIndex = '0';
          item.setAttribute('role', 'button');

          item.classList.add('ql-picker-item');
          if (option.hasAttribute('value')) {
            item.setAttribute('data-value', option.getAttribute('value'));
          }
          if (option.textContent) {
            item.setAttribute('data-label', option.textContent);
          }
          item.addEventListener('click', function () {
            _this2.selectItem(item, true);
          });
          item.addEventListener('keydown', function (event) {
            switch (event.keyCode) {
              // Allows the "Enter" key to select an item
              case _keyboard2.default.keys.ENTER:
                _this2.selectItem(item, true);
                event.preventDefault();
                break;

              // Allows the "Escape" key to close the picker
              case _keyboard2.default.keys.ESCAPE:
                _this2.escape();
                event.preventDefault();
                break;
            }
          });

          return item;
        }
      }, {
        key: 'buildLabel',
        value: function buildLabel() {
          var label = document.createElement('span');
          label.classList.add('ql-picker-label');
          label.innerHTML = _dropdown2.default;
          label.tabIndex = '0';
          label.setAttribute('role', 'button');
          label.setAttribute('aria-expanded', 'false');
          this.container.appendChild(label);
          return label;
        }
      }, {
        key: 'buildOptions',
        value: function buildOptions() {
          var _this3 = this;

          var options = document.createElement('span');
          options.classList.add('ql-picker-options');

          // Don't want screen readers to read this until options are visible
          options.setAttribute('aria-hidden', 'true');
          options.tabIndex = '-1';

          // Need a unique id for aria-controls
          options.id = 'ql-picker-options-' + optionsCounter;
          optionsCounter += 1;
          this.label.setAttribute('aria-controls', options.id);

          this.options = options;

          [].slice.call(this.select.options).forEach(function (option) {
            var item = _this3.buildItem(option);
            options.appendChild(item);
            if (option.selected === true) {
              _this3.selectItem(item);
            }
          });
          this.container.appendChild(options);
        }
      }, {
        key: 'buildPicker',
        value: function buildPicker() {
          var _this4 = this;

          [].slice.call(this.select.attributes).forEach(function (item) {
            _this4.container.setAttribute(item.name, item.value);
          });
          this.container.classList.add('ql-picker');
          this.label = this.buildLabel();
          this.buildOptions();
        }
      }, {
        key: 'escape',
        value: function escape() {
          var _this5 = this;

          // Close menu and return focus to trigger label
          this.close();
          // Need setTimeout for accessibility to ensure that the browser executes
          // focus on the next process thread and after any DOM content changes
          setTimeout(function () {
            return _this5.label.focus();
          }, 1);
        }
      }, {
        key: 'close',
        value: function close() {
          this.container.classList.remove('ql-expanded');
          this.label.setAttribute('aria-expanded', 'false');
          this.options.setAttribute('aria-hidden', 'true');
        }
      }, {
        key: 'selectItem',
        value: function selectItem(item) {
          var trigger = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

          var selected = this.container.querySelector('.ql-selected');
          if (item === selected) return;
          if (selected != null) {
            selected.classList.remove('ql-selected');
          }
          if (item == null) return;
          item.classList.add('ql-selected');
          this.select.selectedIndex = [].indexOf.call(item.parentNode.children, item);
          if (item.hasAttribute('data-value')) {
            this.label.setAttribute('data-value', item.getAttribute('data-value'));
          } else {
            this.label.removeAttribute('data-value');
          }
          if (item.hasAttribute('data-label')) {
            this.label.setAttribute('data-label', item.getAttribute('data-label'));
          } else {
            this.label.removeAttribute('data-label');
          }
          if (trigger) {
            if (typeof Event === 'function') {
              this.select.dispatchEvent(new Event('change'));
            } else if ((typeof Event === 'undefined' ? 'undefined' : _typeof(Event)) === 'object') {
              // IE11
              var event = document.createEvent('Event');
              event.initEvent('change', true, true);
              this.select.dispatchEvent(event);
            }
            this.close();
          }
        }
      }, {
        key: 'update',
        value: function update() {
          var option = void 0;
          if (this.select.selectedIndex > -1) {
            var item = this.container.querySelector('.ql-picker-options').children[this.select.selectedIndex];
            option = this.select.options[this.select.selectedIndex];
            this.selectItem(item);
          } else {
            this.selectItem(null);
          }
          var isActive = option != null && option !== this.select.querySelector('option[selected]');
          this.label.classList.toggle('ql-active', isActive);
        }
      }]);

      return Picker;
    }();

    exports.default = Picker;

    /***/ }),
    /* 29 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    var _break = __webpack_require__(16);

    var _break2 = _interopRequireDefault(_break);

    var _container = __webpack_require__(25);

    var _container2 = _interopRequireDefault(_container);

    var _cursor = __webpack_require__(24);

    var _cursor2 = _interopRequireDefault(_cursor);

    var _embed = __webpack_require__(35);

    var _embed2 = _interopRequireDefault(_embed);

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    var _scroll = __webpack_require__(22);

    var _scroll2 = _interopRequireDefault(_scroll);

    var _text = __webpack_require__(7);

    var _text2 = _interopRequireDefault(_text);

    var _clipboard = __webpack_require__(55);

    var _clipboard2 = _interopRequireDefault(_clipboard);

    var _history = __webpack_require__(42);

    var _history2 = _interopRequireDefault(_history);

    var _keyboard = __webpack_require__(23);

    var _keyboard2 = _interopRequireDefault(_keyboard);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    _quill2.default.register({
      'blots/block': _block2.default,
      'blots/block/embed': _block.BlockEmbed,
      'blots/break': _break2.default,
      'blots/container': _container2.default,
      'blots/cursor': _cursor2.default,
      'blots/embed': _embed2.default,
      'blots/inline': _inline2.default,
      'blots/scroll': _scroll2.default,
      'blots/text': _text2.default,

      'modules/clipboard': _clipboard2.default,
      'modules/history': _history2.default,
      'modules/keyboard': _keyboard2.default
    });

    _parchment2.default.register(_block2.default, _break2.default, _cursor2.default, _inline2.default, _scroll2.default, _text2.default);

    exports.default = _quill2.default;

    /***/ }),
    /* 30 */
    /***/ (function(module, exports, __webpack_require__) {

    Object.defineProperty(exports, "__esModule", { value: true });
    var Registry = __webpack_require__(1);
    var ShadowBlot = /** @class */ (function () {
        function ShadowBlot(domNode) {
            this.domNode = domNode;
            // @ts-ignore
            this.domNode[Registry.DATA_KEY] = { blot: this };
        }
        Object.defineProperty(ShadowBlot.prototype, "statics", {
            // Hack for accessing inherited static methods
            get: function () {
                return this.constructor;
            },
            enumerable: true,
            configurable: true
        });
        ShadowBlot.create = function (value) {
            if (this.tagName == null) {
                throw new Registry.ParchmentError('Blot definition missing tagName');
            }
            var node;
            if (Array.isArray(this.tagName)) {
                if (typeof value === 'string') {
                    value = value.toUpperCase();
                    if (parseInt(value).toString() === value) {
                        value = parseInt(value);
                    }
                }
                if (typeof value === 'number') {
                    node = document.createElement(this.tagName[value - 1]);
                }
                else if (this.tagName.indexOf(value) > -1) {
                    node = document.createElement(value);
                }
                else {
                    node = document.createElement(this.tagName[0]);
                }
            }
            else {
                node = document.createElement(this.tagName);
            }
            if (this.className) {
                node.classList.add(this.className);
            }
            return node;
        };
        ShadowBlot.prototype.attach = function () {
            if (this.parent != null) {
                this.scroll = this.parent.scroll;
            }
        };
        ShadowBlot.prototype.clone = function () {
            var domNode = this.domNode.cloneNode(false);
            return Registry.create(domNode);
        };
        ShadowBlot.prototype.detach = function () {
            if (this.parent != null)
                this.parent.removeChild(this);
            // @ts-ignore
            delete this.domNode[Registry.DATA_KEY];
        };
        ShadowBlot.prototype.deleteAt = function (index, length) {
            var blot = this.isolate(index, length);
            blot.remove();
        };
        ShadowBlot.prototype.formatAt = function (index, length, name, value) {
            var blot = this.isolate(index, length);
            if (Registry.query(name, Registry.Scope.BLOT) != null && value) {
                blot.wrap(name, value);
            }
            else if (Registry.query(name, Registry.Scope.ATTRIBUTE) != null) {
                var parent = Registry.create(this.statics.scope);
                blot.wrap(parent);
                parent.format(name, value);
            }
        };
        ShadowBlot.prototype.insertAt = function (index, value, def) {
            var blot = def == null ? Registry.create('text', value) : Registry.create(value, def);
            var ref = this.split(index);
            this.parent.insertBefore(blot, ref);
        };
        ShadowBlot.prototype.insertInto = function (parentBlot, refBlot) {
            if (refBlot === void 0) { refBlot = null; }
            if (this.parent != null) {
                this.parent.children.remove(this);
            }
            var refDomNode = null;
            parentBlot.children.insertBefore(this, refBlot);
            if (refBlot != null) {
                refDomNode = refBlot.domNode;
            }
            if (this.domNode.parentNode != parentBlot.domNode ||
                this.domNode.nextSibling != refDomNode) {
                parentBlot.domNode.insertBefore(this.domNode, refDomNode);
            }
            this.parent = parentBlot;
            this.attach();
        };
        ShadowBlot.prototype.isolate = function (index, length) {
            var target = this.split(index);
            target.split(length);
            return target;
        };
        ShadowBlot.prototype.length = function () {
            return 1;
        };
        ShadowBlot.prototype.offset = function (root) {
            if (root === void 0) { root = this.parent; }
            if (this.parent == null || this == root)
                return 0;
            return this.parent.children.offset(this) + this.parent.offset(root);
        };
        ShadowBlot.prototype.optimize = function (context) {
            // TODO clean up once we use WeakMap
            // @ts-ignore
            if (this.domNode[Registry.DATA_KEY] != null) {
                // @ts-ignore
                delete this.domNode[Registry.DATA_KEY].mutations;
            }
        };
        ShadowBlot.prototype.remove = function () {
            if (this.domNode.parentNode != null) {
                this.domNode.parentNode.removeChild(this.domNode);
            }
            this.detach();
        };
        ShadowBlot.prototype.replace = function (target) {
            if (target.parent == null)
                return;
            target.parent.insertBefore(this, target.next);
            target.remove();
        };
        ShadowBlot.prototype.replaceWith = function (name, value) {
            var replacement = typeof name === 'string' ? Registry.create(name, value) : name;
            replacement.replace(this);
            return replacement;
        };
        ShadowBlot.prototype.split = function (index, force) {
            return index === 0 ? this : this.next;
        };
        ShadowBlot.prototype.update = function (mutations, context) {
            // Nothing to do by default
        };
        ShadowBlot.prototype.wrap = function (name, value) {
            var wrapper = typeof name === 'string' ? Registry.create(name, value) : name;
            if (this.parent != null) {
                this.parent.insertBefore(wrapper, this.next);
            }
            wrapper.appendChild(this);
            return wrapper;
        };
        ShadowBlot.blotName = 'abstract';
        return ShadowBlot;
    }());
    exports.default = ShadowBlot;


    /***/ }),
    /* 31 */
    /***/ (function(module, exports, __webpack_require__) {

    Object.defineProperty(exports, "__esModule", { value: true });
    var attributor_1 = __webpack_require__(12);
    var class_1 = __webpack_require__(32);
    var style_1 = __webpack_require__(33);
    var Registry = __webpack_require__(1);
    var AttributorStore = /** @class */ (function () {
        function AttributorStore(domNode) {
            this.attributes = {};
            this.domNode = domNode;
            this.build();
        }
        AttributorStore.prototype.attribute = function (attribute, value) {
            // verb
            if (value) {
                if (attribute.add(this.domNode, value)) {
                    if (attribute.value(this.domNode) != null) {
                        this.attributes[attribute.attrName] = attribute;
                    }
                    else {
                        delete this.attributes[attribute.attrName];
                    }
                }
            }
            else {
                attribute.remove(this.domNode);
                delete this.attributes[attribute.attrName];
            }
        };
        AttributorStore.prototype.build = function () {
            var _this = this;
            this.attributes = {};
            var attributes = attributor_1.default.keys(this.domNode);
            var classes = class_1.default.keys(this.domNode);
            var styles = style_1.default.keys(this.domNode);
            attributes
                .concat(classes)
                .concat(styles)
                .forEach(function (name) {
                var attr = Registry.query(name, Registry.Scope.ATTRIBUTE);
                if (attr instanceof attributor_1.default) {
                    _this.attributes[attr.attrName] = attr;
                }
            });
        };
        AttributorStore.prototype.copy = function (target) {
            var _this = this;
            Object.keys(this.attributes).forEach(function (key) {
                var value = _this.attributes[key].value(_this.domNode);
                target.format(key, value);
            });
        };
        AttributorStore.prototype.move = function (target) {
            var _this = this;
            this.copy(target);
            Object.keys(this.attributes).forEach(function (key) {
                _this.attributes[key].remove(_this.domNode);
            });
            this.attributes = {};
        };
        AttributorStore.prototype.values = function () {
            var _this = this;
            return Object.keys(this.attributes).reduce(function (attributes, name) {
                attributes[name] = _this.attributes[name].value(_this.domNode);
                return attributes;
            }, {});
        };
        return AttributorStore;
    }());
    exports.default = AttributorStore;


    /***/ }),
    /* 32 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var attributor_1 = __webpack_require__(12);
    function match(node, prefix) {
        var className = node.getAttribute('class') || '';
        return className.split(/\s+/).filter(function (name) {
            return name.indexOf(prefix + "-") === 0;
        });
    }
    var ClassAttributor = /** @class */ (function (_super) {
        __extends(ClassAttributor, _super);
        function ClassAttributor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ClassAttributor.keys = function (node) {
            return (node.getAttribute('class') || '').split(/\s+/).map(function (name) {
                return name
                    .split('-')
                    .slice(0, -1)
                    .join('-');
            });
        };
        ClassAttributor.prototype.add = function (node, value) {
            if (!this.canAdd(node, value))
                return false;
            this.remove(node);
            node.classList.add(this.keyName + "-" + value);
            return true;
        };
        ClassAttributor.prototype.remove = function (node) {
            var matches = match(node, this.keyName);
            matches.forEach(function (name) {
                node.classList.remove(name);
            });
            if (node.classList.length === 0) {
                node.removeAttribute('class');
            }
        };
        ClassAttributor.prototype.value = function (node) {
            var result = match(node, this.keyName)[0] || '';
            var value = result.slice(this.keyName.length + 1); // +1 for hyphen
            return this.canAdd(node, value) ? value : '';
        };
        return ClassAttributor;
    }(attributor_1.default));
    exports.default = ClassAttributor;


    /***/ }),
    /* 33 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var attributor_1 = __webpack_require__(12);
    function camelize(name) {
        var parts = name.split('-');
        var rest = parts
            .slice(1)
            .map(function (part) {
            return part[0].toUpperCase() + part.slice(1);
        })
            .join('');
        return parts[0] + rest;
    }
    var StyleAttributor = /** @class */ (function (_super) {
        __extends(StyleAttributor, _super);
        function StyleAttributor() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        StyleAttributor.keys = function (node) {
            return (node.getAttribute('style') || '').split(';').map(function (value) {
                var arr = value.split(':');
                return arr[0].trim();
            });
        };
        StyleAttributor.prototype.add = function (node, value) {
            if (!this.canAdd(node, value))
                return false;
            // @ts-ignore
            node.style[camelize(this.keyName)] = value;
            return true;
        };
        StyleAttributor.prototype.remove = function (node) {
            // @ts-ignore
            node.style[camelize(this.keyName)] = '';
            if (!node.getAttribute('style')) {
                node.removeAttribute('style');
            }
        };
        StyleAttributor.prototype.value = function (node) {
            // @ts-ignore
            var value = node.style[camelize(this.keyName)];
            return this.canAdd(node, value) ? value : '';
        };
        return StyleAttributor;
    }(attributor_1.default));
    exports.default = StyleAttributor;


    /***/ }),
    /* 34 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Theme = function () {
      function Theme(quill, options) {
        _classCallCheck(this, Theme);

        this.quill = quill;
        this.options = options;
        this.modules = {};
      }

      _createClass(Theme, [{
        key: 'init',
        value: function init() {
          var _this = this;

          Object.keys(this.options.modules).forEach(function (name) {
            if (_this.modules[name] == null) {
              _this.addModule(name);
            }
          });
        }
      }, {
        key: 'addModule',
        value: function addModule(name) {
          var moduleClass = this.quill.constructor.import('modules/' + name);
          this.modules[name] = new moduleClass(this.quill, this.options.modules[name] || {});
          return this.modules[name];
        }
      }]);

      return Theme;
    }();

    Theme.DEFAULTS = {
      modules: {}
    };
    Theme.themes = {
      'default': Theme
    };

    exports.default = Theme;

    /***/ }),
    /* 35 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _text = __webpack_require__(7);

    var _text2 = _interopRequireDefault(_text);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var GUARD_TEXT = '\uFEFF';

    var Embed = function (_Parchment$Embed) {
      _inherits(Embed, _Parchment$Embed);

      function Embed(node) {
        _classCallCheck(this, Embed);

        var _this = _possibleConstructorReturn(this, (Embed.__proto__ || Object.getPrototypeOf(Embed)).call(this, node));

        _this.contentNode = document.createElement('span');
        _this.contentNode.setAttribute('contenteditable', false);
        [].slice.call(_this.domNode.childNodes).forEach(function (childNode) {
          _this.contentNode.appendChild(childNode);
        });
        _this.leftGuard = document.createTextNode(GUARD_TEXT);
        _this.rightGuard = document.createTextNode(GUARD_TEXT);
        _this.domNode.appendChild(_this.leftGuard);
        _this.domNode.appendChild(_this.contentNode);
        _this.domNode.appendChild(_this.rightGuard);
        return _this;
      }

      _createClass(Embed, [{
        key: 'index',
        value: function index(node, offset) {
          if (node === this.leftGuard) return 0;
          if (node === this.rightGuard) return 1;
          return _get(Embed.prototype.__proto__ || Object.getPrototypeOf(Embed.prototype), 'index', this).call(this, node, offset);
        }
      }, {
        key: 'restore',
        value: function restore(node) {
          var range = void 0,
              textNode = void 0;
          var text = node.data.split(GUARD_TEXT).join('');
          if (node === this.leftGuard) {
            if (this.prev instanceof _text2.default) {
              var prevLength = this.prev.length();
              this.prev.insertAt(prevLength, text);
              range = {
                startNode: this.prev.domNode,
                startOffset: prevLength + text.length
              };
            } else {
              textNode = document.createTextNode(text);
              this.parent.insertBefore(_parchment2.default.create(textNode), this);
              range = {
                startNode: textNode,
                startOffset: text.length
              };
            }
          } else if (node === this.rightGuard) {
            if (this.next instanceof _text2.default) {
              this.next.insertAt(0, text);
              range = {
                startNode: this.next.domNode,
                startOffset: text.length
              };
            } else {
              textNode = document.createTextNode(text);
              this.parent.insertBefore(_parchment2.default.create(textNode), this.next);
              range = {
                startNode: textNode,
                startOffset: text.length
              };
            }
          }
          node.data = GUARD_TEXT;
          return range;
        }
      }, {
        key: 'update',
        value: function update(mutations, context) {
          var _this2 = this;

          mutations.forEach(function (mutation) {
            if (mutation.type === 'characterData' && (mutation.target === _this2.leftGuard || mutation.target === _this2.rightGuard)) {
              var range = _this2.restore(mutation.target);
              if (range) context.range = range;
            }
          });
        }
      }]);

      return Embed;
    }(_parchment2.default.Embed);

    exports.default = Embed;

    /***/ }),
    /* 36 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.AlignStyle = exports.AlignClass = exports.AlignAttribute = undefined;

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var config = {
      scope: _parchment2.default.Scope.BLOCK,
      whitelist: ['right', 'center', 'justify']
    };

    var AlignAttribute = new _parchment2.default.Attributor.Attribute('align', 'align', config);
    var AlignClass = new _parchment2.default.Attributor.Class('align', 'ql-align', config);
    var AlignStyle = new _parchment2.default.Attributor.Style('align', 'text-align', config);

    exports.AlignAttribute = AlignAttribute;
    exports.AlignClass = AlignClass;
    exports.AlignStyle = AlignStyle;

    /***/ }),
    /* 37 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.BackgroundStyle = exports.BackgroundClass = undefined;

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _color = __webpack_require__(26);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var BackgroundClass = new _parchment2.default.Attributor.Class('background', 'ql-bg', {
      scope: _parchment2.default.Scope.INLINE
    });
    var BackgroundStyle = new _color.ColorAttributor('background', 'background-color', {
      scope: _parchment2.default.Scope.INLINE
    });

    exports.BackgroundClass = BackgroundClass;
    exports.BackgroundStyle = BackgroundStyle;

    /***/ }),
    /* 38 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.DirectionStyle = exports.DirectionClass = exports.DirectionAttribute = undefined;

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var config = {
      scope: _parchment2.default.Scope.BLOCK,
      whitelist: ['rtl']
    };

    var DirectionAttribute = new _parchment2.default.Attributor.Attribute('direction', 'dir', config);
    var DirectionClass = new _parchment2.default.Attributor.Class('direction', 'ql-direction', config);
    var DirectionStyle = new _parchment2.default.Attributor.Style('direction', 'direction', config);

    exports.DirectionAttribute = DirectionAttribute;
    exports.DirectionClass = DirectionClass;
    exports.DirectionStyle = DirectionStyle;

    /***/ }),
    /* 39 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.FontClass = exports.FontStyle = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var config = {
      scope: _parchment2.default.Scope.INLINE,
      whitelist: ['serif', 'monospace']
    };

    var FontClass = new _parchment2.default.Attributor.Class('font', 'ql-font', config);

    var FontStyleAttributor = function (_Parchment$Attributor) {
      _inherits(FontStyleAttributor, _Parchment$Attributor);

      function FontStyleAttributor() {
        _classCallCheck(this, FontStyleAttributor);

        return _possibleConstructorReturn(this, (FontStyleAttributor.__proto__ || Object.getPrototypeOf(FontStyleAttributor)).apply(this, arguments));
      }

      _createClass(FontStyleAttributor, [{
        key: 'value',
        value: function value(node) {
          return _get(FontStyleAttributor.prototype.__proto__ || Object.getPrototypeOf(FontStyleAttributor.prototype), 'value', this).call(this, node).replace(/["']/g, '');
        }
      }]);

      return FontStyleAttributor;
    }(_parchment2.default.Attributor.Style);

    var FontStyle = new FontStyleAttributor('font', 'font-family', config);

    exports.FontStyle = FontStyle;
    exports.FontClass = FontClass;

    /***/ }),
    /* 40 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.SizeStyle = exports.SizeClass = undefined;

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    var SizeClass = new _parchment2.default.Attributor.Class('size', 'ql-size', {
      scope: _parchment2.default.Scope.INLINE,
      whitelist: ['small', 'large', 'huge']
    });
    var SizeStyle = new _parchment2.default.Attributor.Style('size', 'font-size', {
      scope: _parchment2.default.Scope.INLINE,
      whitelist: ['10px', '18px', '32px']
    });

    exports.SizeClass = SizeClass;
    exports.SizeStyle = SizeStyle;

    /***/ }),
    /* 41 */
    /***/ (function(module, exports, __webpack_require__) {


    module.exports = {
      'align': {
        '': __webpack_require__(76),
        'center': __webpack_require__(77),
        'right': __webpack_require__(78),
        'justify': __webpack_require__(79)
      },
      'background': __webpack_require__(80),
      'blockquote': __webpack_require__(81),
      'bold': __webpack_require__(82),
      'clean': __webpack_require__(83),
      'code': __webpack_require__(58),
      'code-block': __webpack_require__(58),
      'color': __webpack_require__(84),
      'direction': {
        '': __webpack_require__(85),
        'rtl': __webpack_require__(86)
      },
      'float': {
        'center': __webpack_require__(87),
        'full': __webpack_require__(88),
        'left': __webpack_require__(89),
        'right': __webpack_require__(90)
      },
      'formula': __webpack_require__(91),
      'header': {
        '1': __webpack_require__(92),
        '2': __webpack_require__(93)
      },
      'italic': __webpack_require__(94),
      'image': __webpack_require__(95),
      'indent': {
        '+1': __webpack_require__(96),
        '-1': __webpack_require__(97)
      },
      'link': __webpack_require__(98),
      'list': {
        'ordered': __webpack_require__(99),
        'bullet': __webpack_require__(100),
        'check': __webpack_require__(101)
      },
      'script': {
        'sub': __webpack_require__(102),
        'super': __webpack_require__(103)
      },
      'strike': __webpack_require__(104),
      'underline': __webpack_require__(105),
      'video': __webpack_require__(106)
    };

    /***/ }),
    /* 42 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.getLastChangeIndex = exports.default = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var History = function (_Module) {
      _inherits(History, _Module);

      function History(quill, options) {
        _classCallCheck(this, History);

        var _this = _possibleConstructorReturn(this, (History.__proto__ || Object.getPrototypeOf(History)).call(this, quill, options));

        _this.lastRecorded = 0;
        _this.ignoreChange = false;
        _this.clear();
        _this.quill.on(_quill2.default.events.EDITOR_CHANGE, function (eventName, delta, oldDelta, source) {
          if (eventName !== _quill2.default.events.TEXT_CHANGE || _this.ignoreChange) return;
          if (!_this.options.userOnly || source === _quill2.default.sources.USER) {
            _this.record(delta, oldDelta);
          } else {
            _this.transform(delta);
          }
        });
        _this.quill.keyboard.addBinding({ key: 'Z', shortKey: true }, _this.undo.bind(_this));
        _this.quill.keyboard.addBinding({ key: 'Z', shortKey: true, shiftKey: true }, _this.redo.bind(_this));
        if (/Win/i.test(navigator.platform)) {
          _this.quill.keyboard.addBinding({ key: 'Y', shortKey: true }, _this.redo.bind(_this));
        }
        return _this;
      }

      _createClass(History, [{
        key: 'change',
        value: function change(source, dest) {
          if (this.stack[source].length === 0) return;
          var delta = this.stack[source].pop();
          this.stack[dest].push(delta);
          this.lastRecorded = 0;
          this.ignoreChange = true;
          this.quill.updateContents(delta[source], _quill2.default.sources.USER);
          this.ignoreChange = false;
          var index = getLastChangeIndex(delta[source]);
          this.quill.setSelection(index);
        }
      }, {
        key: 'clear',
        value: function clear() {
          this.stack = { undo: [], redo: [] };
        }
      }, {
        key: 'cutoff',
        value: function cutoff() {
          this.lastRecorded = 0;
        }
      }, {
        key: 'record',
        value: function record(changeDelta, oldDelta) {
          if (changeDelta.ops.length === 0) return;
          this.stack.redo = [];
          var undoDelta = this.quill.getContents().diff(oldDelta);
          var timestamp = Date.now();
          if (this.lastRecorded + this.options.delay > timestamp && this.stack.undo.length > 0) {
            var delta = this.stack.undo.pop();
            undoDelta = undoDelta.compose(delta.undo);
            changeDelta = delta.redo.compose(changeDelta);
          } else {
            this.lastRecorded = timestamp;
          }
          this.stack.undo.push({
            redo: changeDelta,
            undo: undoDelta
          });
          if (this.stack.undo.length > this.options.maxStack) {
            this.stack.undo.shift();
          }
        }
      }, {
        key: 'redo',
        value: function redo() {
          this.change('redo', 'undo');
        }
      }, {
        key: 'transform',
        value: function transform(delta) {
          this.stack.undo.forEach(function (change) {
            change.undo = delta.transform(change.undo, true);
            change.redo = delta.transform(change.redo, true);
          });
          this.stack.redo.forEach(function (change) {
            change.undo = delta.transform(change.undo, true);
            change.redo = delta.transform(change.redo, true);
          });
        }
      }, {
        key: 'undo',
        value: function undo() {
          this.change('undo', 'redo');
        }
      }]);

      return History;
    }(_module2.default);

    History.DEFAULTS = {
      delay: 1000,
      maxStack: 100,
      userOnly: false
    };

    function endsWithNewlineChange(delta) {
      var lastOp = delta.ops[delta.ops.length - 1];
      if (lastOp == null) return false;
      if (lastOp.insert != null) {
        return typeof lastOp.insert === 'string' && lastOp.insert.endsWith('\n');
      }
      if (lastOp.attributes != null) {
        return Object.keys(lastOp.attributes).some(function (attr) {
          return _parchment2.default.query(attr, _parchment2.default.Scope.BLOCK) != null;
        });
      }
      return false;
    }

    function getLastChangeIndex(delta) {
      var deleteLength = delta.reduce(function (length, op) {
        length += op.delete || 0;
        return length;
      }, 0);
      var changeIndex = delta.length() - deleteLength;
      if (endsWithNewlineChange(delta)) {
        changeIndex -= 1;
      }
      return changeIndex;
    }

    exports.default = History;
    exports.getLastChangeIndex = getLastChangeIndex;

    /***/ }),
    /* 43 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.BaseTooltip = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _emitter = __webpack_require__(8);

    var _emitter2 = _interopRequireDefault(_emitter);

    var _keyboard = __webpack_require__(23);

    var _keyboard2 = _interopRequireDefault(_keyboard);

    var _theme = __webpack_require__(34);

    var _theme2 = _interopRequireDefault(_theme);

    var _colorPicker = __webpack_require__(59);

    var _colorPicker2 = _interopRequireDefault(_colorPicker);

    var _iconPicker = __webpack_require__(60);

    var _iconPicker2 = _interopRequireDefault(_iconPicker);

    var _picker = __webpack_require__(28);

    var _picker2 = _interopRequireDefault(_picker);

    var _tooltip = __webpack_require__(61);

    var _tooltip2 = _interopRequireDefault(_tooltip);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var ALIGNS = [false, 'center', 'right', 'justify'];

    var COLORS = ["#000000", "#e60000", "#ff9900", "#ffff00", "#008a00", "#0066cc", "#9933ff", "#ffffff", "#facccc", "#ffebcc", "#ffffcc", "#cce8cc", "#cce0f5", "#ebd6ff", "#bbbbbb", "#f06666", "#ffc266", "#ffff66", "#66b966", "#66a3e0", "#c285ff", "#888888", "#a10000", "#b26b00", "#b2b200", "#006100", "#0047b2", "#6b24b2", "#444444", "#5c0000", "#663d00", "#666600", "#003700", "#002966", "#3d1466"];

    var FONTS = [false, 'serif', 'monospace'];

    var HEADERS = ['1', '2', '3', false];

    var SIZES = ['small', false, 'large', 'huge'];

    var BaseTheme = function (_Theme) {
      _inherits(BaseTheme, _Theme);

      function BaseTheme(quill, options) {
        _classCallCheck(this, BaseTheme);

        var _this = _possibleConstructorReturn(this, (BaseTheme.__proto__ || Object.getPrototypeOf(BaseTheme)).call(this, quill, options));

        var listener = function listener(e) {
          if (!document.body.contains(quill.root)) {
            return document.body.removeEventListener('click', listener);
          }
          if (_this.tooltip != null && !_this.tooltip.root.contains(e.target) && document.activeElement !== _this.tooltip.textbox && !_this.quill.hasFocus()) {
            _this.tooltip.hide();
          }
          if (_this.pickers != null) {
            _this.pickers.forEach(function (picker) {
              if (!picker.container.contains(e.target)) {
                picker.close();
              }
            });
          }
        };
        quill.emitter.listenDOM('click', document.body, listener);
        return _this;
      }

      _createClass(BaseTheme, [{
        key: 'addModule',
        value: function addModule(name) {
          var module = _get(BaseTheme.prototype.__proto__ || Object.getPrototypeOf(BaseTheme.prototype), 'addModule', this).call(this, name);
          if (name === 'toolbar') {
            this.extendToolbar(module);
          }
          return module;
        }
      }, {
        key: 'buildButtons',
        value: function buildButtons(buttons, icons) {
          buttons.forEach(function (button) {
            var className = button.getAttribute('class') || '';
            className.split(/\s+/).forEach(function (name) {
              if (!name.startsWith('ql-')) return;
              name = name.slice('ql-'.length);
              if (icons[name] == null) return;
              if (name === 'direction') {
                button.innerHTML = icons[name][''] + icons[name]['rtl'];
              } else if (typeof icons[name] === 'string') {
                button.innerHTML = icons[name];
              } else {
                var value = button.value || '';
                if (value != null && icons[name][value]) {
                  button.innerHTML = icons[name][value];
                }
              }
            });
          });
        }
      }, {
        key: 'buildPickers',
        value: function buildPickers(selects, icons) {
          var _this2 = this;

          this.pickers = selects.map(function (select) {
            if (select.classList.contains('ql-align')) {
              if (select.querySelector('option') == null) {
                fillSelect(select, ALIGNS);
              }
              return new _iconPicker2.default(select, icons.align);
            } else if (select.classList.contains('ql-background') || select.classList.contains('ql-color')) {
              var format = select.classList.contains('ql-background') ? 'background' : 'color';
              if (select.querySelector('option') == null) {
                fillSelect(select, COLORS, format === 'background' ? '#ffffff' : '#000000');
              }
              return new _colorPicker2.default(select, icons[format]);
            } else {
              if (select.querySelector('option') == null) {
                if (select.classList.contains('ql-font')) {
                  fillSelect(select, FONTS);
                } else if (select.classList.contains('ql-header')) {
                  fillSelect(select, HEADERS);
                } else if (select.classList.contains('ql-size')) {
                  fillSelect(select, SIZES);
                }
              }
              return new _picker2.default(select);
            }
          });
          var update = function update() {
            _this2.pickers.forEach(function (picker) {
              picker.update();
            });
          };
          this.quill.on(_emitter2.default.events.EDITOR_CHANGE, update);
        }
      }]);

      return BaseTheme;
    }(_theme2.default);

    BaseTheme.DEFAULTS = (0, _extend2.default)(true, {}, _theme2.default.DEFAULTS, {
      modules: {
        toolbar: {
          handlers: {
            formula: function formula() {
              this.quill.theme.tooltip.edit('formula');
            },
            image: function image() {
              var _this3 = this;

              var fileInput = this.container.querySelector('input.ql-image[type=file]');
              if (fileInput == null) {
                fileInput = document.createElement('input');
                fileInput.setAttribute('type', 'file');
                fileInput.setAttribute('accept', 'image/png, image/gif, image/jpeg, image/bmp, image/x-icon');
                fileInput.classList.add('ql-image');
                fileInput.addEventListener('change', function () {
                  if (fileInput.files != null && fileInput.files[0] != null) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                      var range = _this3.quill.getSelection(true);
                      _this3.quill.updateContents(new _quillDelta2.default().retain(range.index).delete(range.length).insert({ image: e.target.result }), _emitter2.default.sources.USER);
                      _this3.quill.setSelection(range.index + 1, _emitter2.default.sources.SILENT);
                      fileInput.value = "";
                    };
                    reader.readAsDataURL(fileInput.files[0]);
                  }
                });
                this.container.appendChild(fileInput);
              }
              fileInput.click();
            },
            video: function video() {
              this.quill.theme.tooltip.edit('video');
            }
          }
        }
      }
    });

    var BaseTooltip = function (_Tooltip) {
      _inherits(BaseTooltip, _Tooltip);

      function BaseTooltip(quill, boundsContainer) {
        _classCallCheck(this, BaseTooltip);

        var _this4 = _possibleConstructorReturn(this, (BaseTooltip.__proto__ || Object.getPrototypeOf(BaseTooltip)).call(this, quill, boundsContainer));

        _this4.textbox = _this4.root.querySelector('input[type="text"]');
        _this4.listen();
        return _this4;
      }

      _createClass(BaseTooltip, [{
        key: 'listen',
        value: function listen() {
          var _this5 = this;

          this.textbox.addEventListener('keydown', function (event) {
            if (_keyboard2.default.match(event, 'enter')) {
              _this5.save();
              event.preventDefault();
            } else if (_keyboard2.default.match(event, 'escape')) {
              _this5.cancel();
              event.preventDefault();
            }
          });
        }
      }, {
        key: 'cancel',
        value: function cancel() {
          this.hide();
        }
      }, {
        key: 'edit',
        value: function edit() {
          var mode = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'link';
          var preview = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

          this.root.classList.remove('ql-hidden');
          this.root.classList.add('ql-editing');
          if (preview != null) {
            this.textbox.value = preview;
          } else if (mode !== this.root.getAttribute('data-mode')) {
            this.textbox.value = '';
          }
          this.position(this.quill.getBounds(this.quill.selection.savedRange));
          this.textbox.select();
          this.textbox.setAttribute('placeholder', this.textbox.getAttribute('data-' + mode) || '');
          this.root.setAttribute('data-mode', mode);
        }
      }, {
        key: 'restoreFocus',
        value: function restoreFocus() {
          var scrollTop = this.quill.scrollingContainer.scrollTop;
          this.quill.focus();
          this.quill.scrollingContainer.scrollTop = scrollTop;
        }
      }, {
        key: 'save',
        value: function save() {
          var value = this.textbox.value;
          switch (this.root.getAttribute('data-mode')) {
            case 'link':
              {
                var scrollTop = this.quill.root.scrollTop;
                if (this.linkRange) {
                  this.quill.formatText(this.linkRange, 'link', value, _emitter2.default.sources.USER);
                  delete this.linkRange;
                } else {
                  this.restoreFocus();
                  this.quill.format('link', value, _emitter2.default.sources.USER);
                }
                this.quill.root.scrollTop = scrollTop;
                break;
              }
            case 'video':
              {
                value = extractVideoUrl(value);
              } // eslint-disable-next-line no-fallthrough
            case 'formula':
              {
                if (!value) break;
                var range = this.quill.getSelection(true);
                if (range != null) {
                  var index = range.index + range.length;
                  this.quill.insertEmbed(index, this.root.getAttribute('data-mode'), value, _emitter2.default.sources.USER);
                  if (this.root.getAttribute('data-mode') === 'formula') {
                    this.quill.insertText(index + 1, ' ', _emitter2.default.sources.USER);
                  }
                  this.quill.setSelection(index + 2, _emitter2.default.sources.USER);
                }
                break;
              }
          }
          this.textbox.value = '';
          this.hide();
        }
      }]);

      return BaseTooltip;
    }(_tooltip2.default);

    function extractVideoUrl(url) {
      var match = url.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtube\.com\/watch.*v=([a-zA-Z0-9_-]+)/) || url.match(/^(?:(https?):\/\/)?(?:(?:www|m)\.)?youtu\.be\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return (match[1] || 'https') + '://www.youtube.com/embed/' + match[2] + '?showinfo=0';
      }
      if (match = url.match(/^(?:(https?):\/\/)?(?:www\.)?vimeo\.com\/(\d+)/)) {
        // eslint-disable-line no-cond-assign
        return (match[1] || 'https') + '://player.vimeo.com/video/' + match[2] + '/';
      }
      return url;
    }

    function fillSelect(select, values) {
      var defaultValue = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      values.forEach(function (value) {
        var option = document.createElement('option');
        if (value === defaultValue) {
          option.setAttribute('selected', 'selected');
        } else {
          option.setAttribute('value', value);
        }
        select.appendChild(option);
      });
    }

    exports.BaseTooltip = BaseTooltip;
    exports.default = BaseTheme;

    /***/ }),
    /* 44 */
    /***/ (function(module, exports, __webpack_require__) {

    Object.defineProperty(exports, "__esModule", { value: true });
    var LinkedList = /** @class */ (function () {
        function LinkedList() {
            this.head = this.tail = null;
            this.length = 0;
        }
        LinkedList.prototype.append = function () {
            var nodes = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                nodes[_i] = arguments[_i];
            }
            this.insertBefore(nodes[0], null);
            if (nodes.length > 1) {
                this.append.apply(this, nodes.slice(1));
            }
        };
        LinkedList.prototype.contains = function (node) {
            var cur, next = this.iterator();
            while ((cur = next())) {
                if (cur === node)
                    return true;
            }
            return false;
        };
        LinkedList.prototype.insertBefore = function (node, refNode) {
            if (!node)
                return;
            node.next = refNode;
            if (refNode != null) {
                node.prev = refNode.prev;
                if (refNode.prev != null) {
                    refNode.prev.next = node;
                }
                refNode.prev = node;
                if (refNode === this.head) {
                    this.head = node;
                }
            }
            else if (this.tail != null) {
                this.tail.next = node;
                node.prev = this.tail;
                this.tail = node;
            }
            else {
                node.prev = null;
                this.head = this.tail = node;
            }
            this.length += 1;
        };
        LinkedList.prototype.offset = function (target) {
            var index = 0, cur = this.head;
            while (cur != null) {
                if (cur === target)
                    return index;
                index += cur.length();
                cur = cur.next;
            }
            return -1;
        };
        LinkedList.prototype.remove = function (node) {
            if (!this.contains(node))
                return;
            if (node.prev != null)
                node.prev.next = node.next;
            if (node.next != null)
                node.next.prev = node.prev;
            if (node === this.head)
                this.head = node.next;
            if (node === this.tail)
                this.tail = node.prev;
            this.length -= 1;
        };
        LinkedList.prototype.iterator = function (curNode) {
            if (curNode === void 0) { curNode = this.head; }
            // TODO use yield when we can
            return function () {
                var ret = curNode;
                if (curNode != null)
                    curNode = curNode.next;
                return ret;
            };
        };
        LinkedList.prototype.find = function (index, inclusive) {
            if (inclusive === void 0) { inclusive = false; }
            var cur, next = this.iterator();
            while ((cur = next())) {
                var length = cur.length();
                if (index < length ||
                    (inclusive && index === length && (cur.next == null || cur.next.length() !== 0))) {
                    return [cur, index];
                }
                index -= length;
            }
            return [null, 0];
        };
        LinkedList.prototype.forEach = function (callback) {
            var cur, next = this.iterator();
            while ((cur = next())) {
                callback(cur);
            }
        };
        LinkedList.prototype.forEachAt = function (index, length, callback) {
            if (length <= 0)
                return;
            var _a = this.find(index), startNode = _a[0], offset = _a[1];
            var cur, curIndex = index - offset, next = this.iterator(startNode);
            while ((cur = next()) && curIndex < index + length) {
                var curLength = cur.length();
                if (index > curIndex) {
                    callback(cur, index - curIndex, Math.min(length, curIndex + curLength - index));
                }
                else {
                    callback(cur, 0, Math.min(curLength, index + length - curIndex));
                }
                curIndex += curLength;
            }
        };
        LinkedList.prototype.map = function (callback) {
            return this.reduce(function (memo, cur) {
                memo.push(callback(cur));
                return memo;
            }, []);
        };
        LinkedList.prototype.reduce = function (callback, memo) {
            var cur, next = this.iterator();
            while ((cur = next())) {
                memo = callback(memo, cur);
            }
            return memo;
        };
        return LinkedList;
    }());
    exports.default = LinkedList;


    /***/ }),
    /* 45 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var container_1 = __webpack_require__(17);
    var Registry = __webpack_require__(1);
    var OBSERVER_CONFIG = {
        attributes: true,
        characterData: true,
        characterDataOldValue: true,
        childList: true,
        subtree: true,
    };
    var MAX_OPTIMIZE_ITERATIONS = 100;
    var ScrollBlot = /** @class */ (function (_super) {
        __extends(ScrollBlot, _super);
        function ScrollBlot(node) {
            var _this = _super.call(this, node) || this;
            _this.scroll = _this;
            _this.observer = new MutationObserver(function (mutations) {
                _this.update(mutations);
            });
            _this.observer.observe(_this.domNode, OBSERVER_CONFIG);
            _this.attach();
            return _this;
        }
        ScrollBlot.prototype.detach = function () {
            _super.prototype.detach.call(this);
            this.observer.disconnect();
        };
        ScrollBlot.prototype.deleteAt = function (index, length) {
            this.update();
            if (index === 0 && length === this.length()) {
                this.children.forEach(function (child) {
                    child.remove();
                });
            }
            else {
                _super.prototype.deleteAt.call(this, index, length);
            }
        };
        ScrollBlot.prototype.formatAt = function (index, length, name, value) {
            this.update();
            _super.prototype.formatAt.call(this, index, length, name, value);
        };
        ScrollBlot.prototype.insertAt = function (index, value, def) {
            this.update();
            _super.prototype.insertAt.call(this, index, value, def);
        };
        ScrollBlot.prototype.optimize = function (mutations, context) {
            var _this = this;
            if (mutations === void 0) { mutations = []; }
            if (context === void 0) { context = {}; }
            _super.prototype.optimize.call(this, context);
            // We must modify mutations directly, cannot make copy and then modify
            var records = [].slice.call(this.observer.takeRecords());
            // Array.push currently seems to be implemented by a non-tail recursive function
            // so we cannot just mutations.push.apply(mutations, this.observer.takeRecords());
            while (records.length > 0)
                mutations.push(records.pop());
            // TODO use WeakMap
            var mark = function (blot, markParent) {
                if (markParent === void 0) { markParent = true; }
                if (blot == null || blot === _this)
                    return;
                if (blot.domNode.parentNode == null)
                    return;
                // @ts-ignore
                if (blot.domNode[Registry.DATA_KEY].mutations == null) {
                    // @ts-ignore
                    blot.domNode[Registry.DATA_KEY].mutations = [];
                }
                if (markParent)
                    mark(blot.parent);
            };
            var optimize = function (blot) {
                // Post-order traversal
                if (
                // @ts-ignore
                blot.domNode[Registry.DATA_KEY] == null ||
                    // @ts-ignore
                    blot.domNode[Registry.DATA_KEY].mutations == null) {
                    return;
                }
                if (blot instanceof container_1.default) {
                    blot.children.forEach(optimize);
                }
                blot.optimize(context);
            };
            var remaining = mutations;
            for (var i = 0; remaining.length > 0; i += 1) {
                if (i >= MAX_OPTIMIZE_ITERATIONS) {
                    throw new Error('[Parchment] Maximum optimize iterations reached');
                }
                remaining.forEach(function (mutation) {
                    var blot = Registry.find(mutation.target, true);
                    if (blot == null)
                        return;
                    if (blot.domNode === mutation.target) {
                        if (mutation.type === 'childList') {
                            mark(Registry.find(mutation.previousSibling, false));
                            [].forEach.call(mutation.addedNodes, function (node) {
                                var child = Registry.find(node, false);
                                mark(child, false);
                                if (child instanceof container_1.default) {
                                    child.children.forEach(function (grandChild) {
                                        mark(grandChild, false);
                                    });
                                }
                            });
                        }
                        else if (mutation.type === 'attributes') {
                            mark(blot.prev);
                        }
                    }
                    mark(blot);
                });
                this.children.forEach(optimize);
                remaining = [].slice.call(this.observer.takeRecords());
                records = remaining.slice();
                while (records.length > 0)
                    mutations.push(records.pop());
            }
        };
        ScrollBlot.prototype.update = function (mutations, context) {
            var _this = this;
            if (context === void 0) { context = {}; }
            mutations = mutations || this.observer.takeRecords();
            // TODO use WeakMap
            mutations
                .map(function (mutation) {
                var blot = Registry.find(mutation.target, true);
                if (blot == null)
                    return null;
                // @ts-ignore
                if (blot.domNode[Registry.DATA_KEY].mutations == null) {
                    // @ts-ignore
                    blot.domNode[Registry.DATA_KEY].mutations = [mutation];
                    return blot;
                }
                else {
                    // @ts-ignore
                    blot.domNode[Registry.DATA_KEY].mutations.push(mutation);
                    return null;
                }
            })
                .forEach(function (blot) {
                if (blot == null ||
                    blot === _this ||
                    //@ts-ignore
                    blot.domNode[Registry.DATA_KEY] == null)
                    return;
                // @ts-ignore
                blot.update(blot.domNode[Registry.DATA_KEY].mutations || [], context);
            });
            // @ts-ignore
            if (this.domNode[Registry.DATA_KEY].mutations != null) {
                // @ts-ignore
                _super.prototype.update.call(this, this.domNode[Registry.DATA_KEY].mutations, context);
            }
            this.optimize(mutations, context);
        };
        ScrollBlot.blotName = 'scroll';
        ScrollBlot.defaultChild = 'block';
        ScrollBlot.scope = Registry.Scope.BLOCK_BLOT;
        ScrollBlot.tagName = 'DIV';
        return ScrollBlot;
    }(container_1.default));
    exports.default = ScrollBlot;


    /***/ }),
    /* 46 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var format_1 = __webpack_require__(18);
    var Registry = __webpack_require__(1);
    // Shallow object comparison
    function isEqual(obj1, obj2) {
        if (Object.keys(obj1).length !== Object.keys(obj2).length)
            return false;
        // @ts-ignore
        for (var prop in obj1) {
            // @ts-ignore
            if (obj1[prop] !== obj2[prop])
                return false;
        }
        return true;
    }
    var InlineBlot = /** @class */ (function (_super) {
        __extends(InlineBlot, _super);
        function InlineBlot() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        InlineBlot.formats = function (domNode) {
            if (domNode.tagName === InlineBlot.tagName)
                return undefined;
            return _super.formats.call(this, domNode);
        };
        InlineBlot.prototype.format = function (name, value) {
            var _this = this;
            if (name === this.statics.blotName && !value) {
                this.children.forEach(function (child) {
                    if (!(child instanceof format_1.default)) {
                        child = child.wrap(InlineBlot.blotName, true);
                    }
                    _this.attributes.copy(child);
                });
                this.unwrap();
            }
            else {
                _super.prototype.format.call(this, name, value);
            }
        };
        InlineBlot.prototype.formatAt = function (index, length, name, value) {
            if (this.formats()[name] != null || Registry.query(name, Registry.Scope.ATTRIBUTE)) {
                var blot = this.isolate(index, length);
                blot.format(name, value);
            }
            else {
                _super.prototype.formatAt.call(this, index, length, name, value);
            }
        };
        InlineBlot.prototype.optimize = function (context) {
            _super.prototype.optimize.call(this, context);
            var formats = this.formats();
            if (Object.keys(formats).length === 0) {
                return this.unwrap(); // unformatted span
            }
            var next = this.next;
            if (next instanceof InlineBlot && next.prev === this && isEqual(formats, next.formats())) {
                next.moveChildren(this);
                next.remove();
            }
        };
        InlineBlot.blotName = 'inline';
        InlineBlot.scope = Registry.Scope.INLINE_BLOT;
        InlineBlot.tagName = 'SPAN';
        return InlineBlot;
    }(format_1.default));
    exports.default = InlineBlot;


    /***/ }),
    /* 47 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var format_1 = __webpack_require__(18);
    var Registry = __webpack_require__(1);
    var BlockBlot = /** @class */ (function (_super) {
        __extends(BlockBlot, _super);
        function BlockBlot() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BlockBlot.formats = function (domNode) {
            var tagName = Registry.query(BlockBlot.blotName).tagName;
            if (domNode.tagName === tagName)
                return undefined;
            return _super.formats.call(this, domNode);
        };
        BlockBlot.prototype.format = function (name, value) {
            if (Registry.query(name, Registry.Scope.BLOCK) == null) {
                return;
            }
            else if (name === this.statics.blotName && !value) {
                this.replaceWith(BlockBlot.blotName);
            }
            else {
                _super.prototype.format.call(this, name, value);
            }
        };
        BlockBlot.prototype.formatAt = function (index, length, name, value) {
            if (Registry.query(name, Registry.Scope.BLOCK) != null) {
                this.format(name, value);
            }
            else {
                _super.prototype.formatAt.call(this, index, length, name, value);
            }
        };
        BlockBlot.prototype.insertAt = function (index, value, def) {
            if (def == null || Registry.query(value, Registry.Scope.INLINE) != null) {
                // Insert text or inline
                _super.prototype.insertAt.call(this, index, value, def);
            }
            else {
                var after = this.split(index);
                var blot = Registry.create(value, def);
                after.parent.insertBefore(blot, after);
            }
        };
        BlockBlot.prototype.update = function (mutations, context) {
            if (navigator.userAgent.match(/Trident/)) {
                this.build();
            }
            else {
                _super.prototype.update.call(this, mutations, context);
            }
        };
        BlockBlot.blotName = 'block';
        BlockBlot.scope = Registry.Scope.BLOCK_BLOT;
        BlockBlot.tagName = 'P';
        return BlockBlot;
    }(format_1.default));
    exports.default = BlockBlot;


    /***/ }),
    /* 48 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var leaf_1 = __webpack_require__(19);
    var EmbedBlot = /** @class */ (function (_super) {
        __extends(EmbedBlot, _super);
        function EmbedBlot() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        EmbedBlot.formats = function (domNode) {
            return undefined;
        };
        EmbedBlot.prototype.format = function (name, value) {
            // super.formatAt wraps, which is what we want in general,
            // but this allows subclasses to overwrite for formats
            // that just apply to particular embeds
            _super.prototype.formatAt.call(this, 0, this.length(), name, value);
        };
        EmbedBlot.prototype.formatAt = function (index, length, name, value) {
            if (index === 0 && length === this.length()) {
                this.format(name, value);
            }
            else {
                _super.prototype.formatAt.call(this, index, length, name, value);
            }
        };
        EmbedBlot.prototype.formats = function () {
            return this.statics.formats(this.domNode);
        };
        return EmbedBlot;
    }(leaf_1.default));
    exports.default = EmbedBlot;


    /***/ }),
    /* 49 */
    /***/ (function(module, exports, __webpack_require__) {

    var __extends = (this && this.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var leaf_1 = __webpack_require__(19);
    var Registry = __webpack_require__(1);
    var TextBlot = /** @class */ (function (_super) {
        __extends(TextBlot, _super);
        function TextBlot(node) {
            var _this = _super.call(this, node) || this;
            _this.text = _this.statics.value(_this.domNode);
            return _this;
        }
        TextBlot.create = function (value) {
            return document.createTextNode(value);
        };
        TextBlot.value = function (domNode) {
            var text = domNode.data;
            // @ts-ignore
            if (text['normalize'])
                text = text['normalize']();
            return text;
        };
        TextBlot.prototype.deleteAt = function (index, length) {
            this.domNode.data = this.text = this.text.slice(0, index) + this.text.slice(index + length);
        };
        TextBlot.prototype.index = function (node, offset) {
            if (this.domNode === node) {
                return offset;
            }
            return -1;
        };
        TextBlot.prototype.insertAt = function (index, value, def) {
            if (def == null) {
                this.text = this.text.slice(0, index) + value + this.text.slice(index);
                this.domNode.data = this.text;
            }
            else {
                _super.prototype.insertAt.call(this, index, value, def);
            }
        };
        TextBlot.prototype.length = function () {
            return this.text.length;
        };
        TextBlot.prototype.optimize = function (context) {
            _super.prototype.optimize.call(this, context);
            this.text = this.statics.value(this.domNode);
            if (this.text.length === 0) {
                this.remove();
            }
            else if (this.next instanceof TextBlot && this.next.prev === this) {
                this.insertAt(this.length(), this.next.value());
                this.next.remove();
            }
        };
        TextBlot.prototype.position = function (index, inclusive) {
            return [this.domNode, index];
        };
        TextBlot.prototype.split = function (index, force) {
            if (force === void 0) { force = false; }
            if (!force) {
                if (index === 0)
                    return this;
                if (index === this.length())
                    return this.next;
            }
            var after = Registry.create(this.domNode.splitText(index));
            this.parent.insertBefore(after, this.next);
            this.text = this.statics.value(this.domNode);
            return after;
        };
        TextBlot.prototype.update = function (mutations, context) {
            var _this = this;
            if (mutations.some(function (mutation) {
                return mutation.type === 'characterData' && mutation.target === _this.domNode;
            })) {
                this.text = this.statics.value(this.domNode);
            }
        };
        TextBlot.prototype.value = function () {
            return this.text;
        };
        TextBlot.blotName = 'text';
        TextBlot.scope = Registry.Scope.INLINE_BLOT;
        return TextBlot;
    }(leaf_1.default));
    exports.default = TextBlot;


    /***/ }),
    /* 50 */
    /***/ (function(module, exports, __webpack_require__) {


    var elem = document.createElement('div');
    elem.classList.toggle('test-class', false);
    if (elem.classList.contains('test-class')) {
      var _toggle = DOMTokenList.prototype.toggle;
      DOMTokenList.prototype.toggle = function (token, force) {
        if (arguments.length > 1 && !this.contains(token) === !force) {
          return force;
        } else {
          return _toggle.call(this, token);
        }
      };
    }

    if (!String.prototype.startsWith) {
      String.prototype.startsWith = function (searchString, position) {
        position = position || 0;
        return this.substr(position, searchString.length) === searchString;
      };
    }

    if (!String.prototype.endsWith) {
      String.prototype.endsWith = function (searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
          position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
      };
    }

    if (!Array.prototype.find) {
      Object.defineProperty(Array.prototype, "find", {
        value: function value(predicate) {
          if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
          }
          if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
          }
          var list = Object(this);
          var length = list.length >>> 0;
          var thisArg = arguments[1];
          var value;

          for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
              return value;
            }
          }
          return undefined;
        }
      });
    }

    document.addEventListener("DOMContentLoaded", function () {
      // Disable resizing in Firefox
      document.execCommand("enableObjectResizing", false, false);
      // Disable automatic linkifying in IE11
      document.execCommand("autoUrlDetect", false, false);
    });

    /***/ }),
    /* 51 */
    /***/ (function(module, exports) {

    /**
     * This library modifies the diff-patch-match library by Neil Fraser
     * by removing the patch and match functionality and certain advanced
     * options in the diff function. The original license is as follows:
     *
     * ===
     *
     * Diff Match and Patch
     *
     * Copyright 2006 Google Inc.
     * http://code.google.com/p/google-diff-match-patch/
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     *   http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */


    /**
     * The data structure representing a diff is an array of tuples:
     * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
     * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
     */
    var DIFF_DELETE = -1;
    var DIFF_INSERT = 1;
    var DIFF_EQUAL = 0;


    /**
     * Find the differences between two texts.  Simplifies the problem by stripping
     * any common prefix or suffix off the texts before diffing.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {Int} cursor_pos Expected edit position in text1 (optional)
     * @return {Array} Array of diff tuples.
     */
    function diff_main(text1, text2, cursor_pos) {
      // Check for equality (speedup).
      if (text1 == text2) {
        if (text1) {
          return [[DIFF_EQUAL, text1]];
        }
        return [];
      }

      // Check cursor_pos within bounds
      if (cursor_pos < 0 || text1.length < cursor_pos) {
        cursor_pos = null;
      }

      // Trim off common prefix (speedup).
      var commonlength = diff_commonPrefix(text1, text2);
      var commonprefix = text1.substring(0, commonlength);
      text1 = text1.substring(commonlength);
      text2 = text2.substring(commonlength);

      // Trim off common suffix (speedup).
      commonlength = diff_commonSuffix(text1, text2);
      var commonsuffix = text1.substring(text1.length - commonlength);
      text1 = text1.substring(0, text1.length - commonlength);
      text2 = text2.substring(0, text2.length - commonlength);

      // Compute the diff on the middle block.
      var diffs = diff_compute_(text1, text2);

      // Restore the prefix and suffix.
      if (commonprefix) {
        diffs.unshift([DIFF_EQUAL, commonprefix]);
      }
      if (commonsuffix) {
        diffs.push([DIFF_EQUAL, commonsuffix]);
      }
      diff_cleanupMerge(diffs);
      if (cursor_pos != null) {
        diffs = fix_cursor(diffs, cursor_pos);
      }
      diffs = fix_emoji(diffs);
      return diffs;
    }

    /**
     * Find the differences between two texts.  Assumes that the texts do not
     * have any common prefix or suffix.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @return {Array} Array of diff tuples.
     */
    function diff_compute_(text1, text2) {
      var diffs;

      if (!text1) {
        // Just add some text (speedup).
        return [[DIFF_INSERT, text2]];
      }

      if (!text2) {
        // Just delete some text (speedup).
        return [[DIFF_DELETE, text1]];
      }

      var longtext = text1.length > text2.length ? text1 : text2;
      var shorttext = text1.length > text2.length ? text2 : text1;
      var i = longtext.indexOf(shorttext);
      if (i != -1) {
        // Shorter text is inside the longer text (speedup).
        diffs = [[DIFF_INSERT, longtext.substring(0, i)],
                 [DIFF_EQUAL, shorttext],
                 [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
        // Swap insertions for deletions if diff is reversed.
        if (text1.length > text2.length) {
          diffs[0][0] = diffs[2][0] = DIFF_DELETE;
        }
        return diffs;
      }

      if (shorttext.length == 1) {
        // Single character string.
        // After the previous speedup, the character can't be an equality.
        return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
      }

      // Check to see if the problem can be split in two.
      var hm = diff_halfMatch_(text1, text2);
      if (hm) {
        // A half-match was found, sort out the return data.
        var text1_a = hm[0];
        var text1_b = hm[1];
        var text2_a = hm[2];
        var text2_b = hm[3];
        var mid_common = hm[4];
        // Send both pairs off for separate processing.
        var diffs_a = diff_main(text1_a, text2_a);
        var diffs_b = diff_main(text1_b, text2_b);
        // Merge the results.
        return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
      }

      return diff_bisect_(text1, text2);
    }

    /**
     * Find the 'middle snake' of a diff, split the problem in two
     * and return the recursively constructed diff.
     * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @return {Array} Array of diff tuples.
     * @private
     */
    function diff_bisect_(text1, text2) {
      // Cache the text lengths to prevent multiple calls.
      var text1_length = text1.length;
      var text2_length = text2.length;
      var max_d = Math.ceil((text1_length + text2_length) / 2);
      var v_offset = max_d;
      var v_length = 2 * max_d;
      var v1 = new Array(v_length);
      var v2 = new Array(v_length);
      // Setting all elements to -1 is faster in Chrome & Firefox than mixing
      // integers and undefined.
      for (var x = 0; x < v_length; x++) {
        v1[x] = -1;
        v2[x] = -1;
      }
      v1[v_offset + 1] = 0;
      v2[v_offset + 1] = 0;
      var delta = text1_length - text2_length;
      // If the total number of characters is odd, then the front path will collide
      // with the reverse path.
      var front = (delta % 2 != 0);
      // Offsets for start and end of k loop.
      // Prevents mapping of space beyond the grid.
      var k1start = 0;
      var k1end = 0;
      var k2start = 0;
      var k2end = 0;
      for (var d = 0; d < max_d; d++) {
        // Walk the front path one step.
        for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
          var k1_offset = v_offset + k1;
          var x1;
          if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
            x1 = v1[k1_offset + 1];
          } else {
            x1 = v1[k1_offset - 1] + 1;
          }
          var y1 = x1 - k1;
          while (x1 < text1_length && y1 < text2_length &&
                 text1.charAt(x1) == text2.charAt(y1)) {
            x1++;
            y1++;
          }
          v1[k1_offset] = x1;
          if (x1 > text1_length) {
            // Ran off the right of the graph.
            k1end += 2;
          } else if (y1 > text2_length) {
            // Ran off the bottom of the graph.
            k1start += 2;
          } else if (front) {
            var k2_offset = v_offset + delta - k1;
            if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
              // Mirror x2 onto top-left coordinate system.
              var x2 = text1_length - v2[k2_offset];
              if (x1 >= x2) {
                // Overlap detected.
                return diff_bisectSplit_(text1, text2, x1, y1);
              }
            }
          }
        }

        // Walk the reverse path one step.
        for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
          var k2_offset = v_offset + k2;
          var x2;
          if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
            x2 = v2[k2_offset + 1];
          } else {
            x2 = v2[k2_offset - 1] + 1;
          }
          var y2 = x2 - k2;
          while (x2 < text1_length && y2 < text2_length &&
                 text1.charAt(text1_length - x2 - 1) ==
                 text2.charAt(text2_length - y2 - 1)) {
            x2++;
            y2++;
          }
          v2[k2_offset] = x2;
          if (x2 > text1_length) {
            // Ran off the left of the graph.
            k2end += 2;
          } else if (y2 > text2_length) {
            // Ran off the top of the graph.
            k2start += 2;
          } else if (!front) {
            var k1_offset = v_offset + delta - k2;
            if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
              var x1 = v1[k1_offset];
              var y1 = v_offset + x1 - k1_offset;
              // Mirror x2 onto top-left coordinate system.
              x2 = text1_length - x2;
              if (x1 >= x2) {
                // Overlap detected.
                return diff_bisectSplit_(text1, text2, x1, y1);
              }
            }
          }
        }
      }
      // Diff took too long and hit the deadline or
      // number of diffs equals number of characters, no commonality at all.
      return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
    }

    /**
     * Given the location of the 'middle snake', split the diff in two parts
     * and recurse.
     * @param {string} text1 Old string to be diffed.
     * @param {string} text2 New string to be diffed.
     * @param {number} x Index of split point in text1.
     * @param {number} y Index of split point in text2.
     * @return {Array} Array of diff tuples.
     */
    function diff_bisectSplit_(text1, text2, x, y) {
      var text1a = text1.substring(0, x);
      var text2a = text2.substring(0, y);
      var text1b = text1.substring(x);
      var text2b = text2.substring(y);

      // Compute both diffs serially.
      var diffs = diff_main(text1a, text2a);
      var diffsb = diff_main(text1b, text2b);

      return diffs.concat(diffsb);
    }

    /**
     * Determine the common prefix of two strings.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {number} The number of characters common to the start of each
     *     string.
     */
    function diff_commonPrefix(text1, text2) {
      // Quick check for common null cases.
      if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
        return 0;
      }
      // Binary search.
      // Performance analysis: http://neil.fraser.name/news/2007/10/09/
      var pointermin = 0;
      var pointermax = Math.min(text1.length, text2.length);
      var pointermid = pointermax;
      var pointerstart = 0;
      while (pointermin < pointermid) {
        if (text1.substring(pointerstart, pointermid) ==
            text2.substring(pointerstart, pointermid)) {
          pointermin = pointermid;
          pointerstart = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      return pointermid;
    }

    /**
     * Determine the common suffix of two strings.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {number} The number of characters common to the end of each string.
     */
    function diff_commonSuffix(text1, text2) {
      // Quick check for common null cases.
      if (!text1 || !text2 ||
          text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
        return 0;
      }
      // Binary search.
      // Performance analysis: http://neil.fraser.name/news/2007/10/09/
      var pointermin = 0;
      var pointermax = Math.min(text1.length, text2.length);
      var pointermid = pointermax;
      var pointerend = 0;
      while (pointermin < pointermid) {
        if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
            text2.substring(text2.length - pointermid, text2.length - pointerend)) {
          pointermin = pointermid;
          pointerend = pointermin;
        } else {
          pointermax = pointermid;
        }
        pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
      }
      return pointermid;
    }

    /**
     * Do the two texts share a substring which is at least half the length of the
     * longer text?
     * This speedup can produce non-minimal diffs.
     * @param {string} text1 First string.
     * @param {string} text2 Second string.
     * @return {Array.<string>} Five element Array, containing the prefix of
     *     text1, the suffix of text1, the prefix of text2, the suffix of
     *     text2 and the common middle.  Or null if there was no match.
     */
    function diff_halfMatch_(text1, text2) {
      var longtext = text1.length > text2.length ? text1 : text2;
      var shorttext = text1.length > text2.length ? text2 : text1;
      if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
        return null;  // Pointless.
      }

      /**
       * Does a substring of shorttext exist within longtext such that the substring
       * is at least half the length of longtext?
       * Closure, but does not reference any external variables.
       * @param {string} longtext Longer string.
       * @param {string} shorttext Shorter string.
       * @param {number} i Start index of quarter length substring within longtext.
       * @return {Array.<string>} Five element Array, containing the prefix of
       *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
       *     of shorttext and the common middle.  Or null if there was no match.
       * @private
       */
      function diff_halfMatchI_(longtext, shorttext, i) {
        // Start with a 1/4 length substring at position i as a seed.
        var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
        var j = -1;
        var best_common = '';
        var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
        while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
          var prefixLength = diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
          var suffixLength = diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
          if (best_common.length < suffixLength + prefixLength) {
            best_common = shorttext.substring(j - suffixLength, j) +
                shorttext.substring(j, j + prefixLength);
            best_longtext_a = longtext.substring(0, i - suffixLength);
            best_longtext_b = longtext.substring(i + prefixLength);
            best_shorttext_a = shorttext.substring(0, j - suffixLength);
            best_shorttext_b = shorttext.substring(j + prefixLength);
          }
        }
        if (best_common.length * 2 >= longtext.length) {
          return [best_longtext_a, best_longtext_b,
                  best_shorttext_a, best_shorttext_b, best_common];
        } else {
          return null;
        }
      }

      // First check if the second quarter is the seed for a half-match.
      var hm1 = diff_halfMatchI_(longtext, shorttext,
                                 Math.ceil(longtext.length / 4));
      // Check again based on the third quarter.
      var hm2 = diff_halfMatchI_(longtext, shorttext,
                                 Math.ceil(longtext.length / 2));
      var hm;
      if (!hm1 && !hm2) {
        return null;
      } else if (!hm2) {
        hm = hm1;
      } else if (!hm1) {
        hm = hm2;
      } else {
        // Both matched.  Select the longest.
        hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
      }

      // A half-match was found, sort out the return data.
      var text1_a, text1_b, text2_a, text2_b;
      if (text1.length > text2.length) {
        text1_a = hm[0];
        text1_b = hm[1];
        text2_a = hm[2];
        text2_b = hm[3];
      } else {
        text2_a = hm[0];
        text2_b = hm[1];
        text1_a = hm[2];
        text1_b = hm[3];
      }
      var mid_common = hm[4];
      return [text1_a, text1_b, text2_a, text2_b, mid_common];
    }

    /**
     * Reorder and merge like edit sections.  Merge equalities.
     * Any edit section can move as long as it doesn't cross an equality.
     * @param {Array} diffs Array of diff tuples.
     */
    function diff_cleanupMerge(diffs) {
      diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
      var pointer = 0;
      var count_delete = 0;
      var count_insert = 0;
      var text_delete = '';
      var text_insert = '';
      var commonlength;
      while (pointer < diffs.length) {
        switch (diffs[pointer][0]) {
          case DIFF_INSERT:
            count_insert++;
            text_insert += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_DELETE:
            count_delete++;
            text_delete += diffs[pointer][1];
            pointer++;
            break;
          case DIFF_EQUAL:
            // Upon reaching an equality, check for prior redundancies.
            if (count_delete + count_insert > 1) {
              if (count_delete !== 0 && count_insert !== 0) {
                // Factor out any common prefixies.
                commonlength = diff_commonPrefix(text_insert, text_delete);
                if (commonlength !== 0) {
                  if ((pointer - count_delete - count_insert) > 0 &&
                      diffs[pointer - count_delete - count_insert - 1][0] ==
                      DIFF_EQUAL) {
                    diffs[pointer - count_delete - count_insert - 1][1] +=
                        text_insert.substring(0, commonlength);
                  } else {
                    diffs.splice(0, 0, [DIFF_EQUAL,
                                        text_insert.substring(0, commonlength)]);
                    pointer++;
                  }
                  text_insert = text_insert.substring(commonlength);
                  text_delete = text_delete.substring(commonlength);
                }
                // Factor out any common suffixies.
                commonlength = diff_commonSuffix(text_insert, text_delete);
                if (commonlength !== 0) {
                  diffs[pointer][1] = text_insert.substring(text_insert.length -
                      commonlength) + diffs[pointer][1];
                  text_insert = text_insert.substring(0, text_insert.length -
                      commonlength);
                  text_delete = text_delete.substring(0, text_delete.length -
                      commonlength);
                }
              }
              // Delete the offending records and add the merged ones.
              if (count_delete === 0) {
                diffs.splice(pointer - count_insert,
                    count_delete + count_insert, [DIFF_INSERT, text_insert]);
              } else if (count_insert === 0) {
                diffs.splice(pointer - count_delete,
                    count_delete + count_insert, [DIFF_DELETE, text_delete]);
              } else {
                diffs.splice(pointer - count_delete - count_insert,
                    count_delete + count_insert, [DIFF_DELETE, text_delete],
                    [DIFF_INSERT, text_insert]);
              }
              pointer = pointer - count_delete - count_insert +
                        (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
            } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
              // Merge this equality with the previous one.
              diffs[pointer - 1][1] += diffs[pointer][1];
              diffs.splice(pointer, 1);
            } else {
              pointer++;
            }
            count_insert = 0;
            count_delete = 0;
            text_delete = '';
            text_insert = '';
            break;
        }
      }
      if (diffs[diffs.length - 1][1] === '') {
        diffs.pop();  // Remove the dummy entry at the end.
      }

      // Second pass: look for single edits surrounded on both sides by equalities
      // which can be shifted sideways to eliminate an equality.
      // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
      var changes = false;
      pointer = 1;
      // Intentionally ignore the first and last element (don't need checking).
      while (pointer < diffs.length - 1) {
        if (diffs[pointer - 1][0] == DIFF_EQUAL &&
            diffs[pointer + 1][0] == DIFF_EQUAL) {
          // This is a single edit surrounded by equalities.
          if (diffs[pointer][1].substring(diffs[pointer][1].length -
              diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
            // Shift the edit over the previous equality.
            diffs[pointer][1] = diffs[pointer - 1][1] +
                diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                            diffs[pointer - 1][1].length);
            diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
            diffs.splice(pointer - 1, 1);
            changes = true;
          } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
              diffs[pointer + 1][1]) {
            // Shift the edit over the next equality.
            diffs[pointer - 1][1] += diffs[pointer + 1][1];
            diffs[pointer][1] =
                diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
                diffs[pointer + 1][1];
            diffs.splice(pointer + 1, 1);
            changes = true;
          }
        }
        pointer++;
      }
      // If shifts were made, the diff needs reordering and another shift sweep.
      if (changes) {
        diff_cleanupMerge(diffs);
      }
    }

    var diff = diff_main;
    diff.INSERT = DIFF_INSERT;
    diff.DELETE = DIFF_DELETE;
    diff.EQUAL = DIFF_EQUAL;

    module.exports = diff;

    /*
     * Modify a diff such that the cursor position points to the start of a change:
     * E.g.
     *   cursor_normalize_diff([[DIFF_EQUAL, 'abc']], 1)
     *     => [1, [[DIFF_EQUAL, 'a'], [DIFF_EQUAL, 'bc']]]
     *   cursor_normalize_diff([[DIFF_INSERT, 'new'], [DIFF_DELETE, 'xyz']], 2)
     *     => [2, [[DIFF_INSERT, 'new'], [DIFF_DELETE, 'xy'], [DIFF_DELETE, 'z']]]
     *
     * @param {Array} diffs Array of diff tuples
     * @param {Int} cursor_pos Suggested edit position. Must not be out of bounds!
     * @return {Array} A tuple [cursor location in the modified diff, modified diff]
     */
    function cursor_normalize_diff (diffs, cursor_pos) {
      if (cursor_pos === 0) {
        return [DIFF_EQUAL, diffs];
      }
      for (var current_pos = 0, i = 0; i < diffs.length; i++) {
        var d = diffs[i];
        if (d[0] === DIFF_DELETE || d[0] === DIFF_EQUAL) {
          var next_pos = current_pos + d[1].length;
          if (cursor_pos === next_pos) {
            return [i + 1, diffs];
          } else if (cursor_pos < next_pos) {
            // copy to prevent side effects
            diffs = diffs.slice();
            // split d into two diff changes
            var split_pos = cursor_pos - current_pos;
            var d_left = [d[0], d[1].slice(0, split_pos)];
            var d_right = [d[0], d[1].slice(split_pos)];
            diffs.splice(i, 1, d_left, d_right);
            return [i + 1, diffs];
          } else {
            current_pos = next_pos;
          }
        }
      }
      throw new Error('cursor_pos is out of bounds!')
    }

    /*
     * Modify a diff such that the edit position is "shifted" to the proposed edit location (cursor_position).
     *
     * Case 1)
     *   Check if a naive shift is possible:
     *     [0, X], [ 1, Y] -> [ 1, Y], [0, X]    (if X + Y === Y + X)
     *     [0, X], [-1, Y] -> [-1, Y], [0, X]    (if X + Y === Y + X) - holds same result
     * Case 2)
     *   Check if the following shifts are possible:
     *     [0, 'pre'], [ 1, 'prefix'] -> [ 1, 'pre'], [0, 'pre'], [ 1, 'fix']
     *     [0, 'pre'], [-1, 'prefix'] -> [-1, 'pre'], [0, 'pre'], [-1, 'fix']
     *         ^            ^
     *         d          d_next
     *
     * @param {Array} diffs Array of diff tuples
     * @param {Int} cursor_pos Suggested edit position. Must not be out of bounds!
     * @return {Array} Array of diff tuples
     */
    function fix_cursor (diffs, cursor_pos) {
      var norm = cursor_normalize_diff(diffs, cursor_pos);
      var ndiffs = norm[1];
      var cursor_pointer = norm[0];
      var d = ndiffs[cursor_pointer];
      var d_next = ndiffs[cursor_pointer + 1];

      if (d == null) {
        // Text was deleted from end of original string,
        // cursor is now out of bounds in new string
        return diffs;
      } else if (d[0] !== DIFF_EQUAL) {
        // A modification happened at the cursor location.
        // This is the expected outcome, so we can return the original diff.
        return diffs;
      } else {
        if (d_next != null && d[1] + d_next[1] === d_next[1] + d[1]) {
          // Case 1)
          // It is possible to perform a naive shift
          ndiffs.splice(cursor_pointer, 2, d_next, d);
          return merge_tuples(ndiffs, cursor_pointer, 2)
        } else if (d_next != null && d_next[1].indexOf(d[1]) === 0) {
          // Case 2)
          // d[1] is a prefix of d_next[1]
          // We can assume that d_next[0] !== 0, since d[0] === 0
          // Shift edit locations..
          ndiffs.splice(cursor_pointer, 2, [d_next[0], d[1]], [0, d[1]]);
          var suffix = d_next[1].slice(d[1].length);
          if (suffix.length > 0) {
            ndiffs.splice(cursor_pointer + 2, 0, [d_next[0], suffix]);
          }
          return merge_tuples(ndiffs, cursor_pointer, 3)
        } else {
          // Not possible to perform any modification
          return diffs;
        }
      }
    }

    /*
     * Check diff did not split surrogate pairs.
     * Ex. [0, '\uD83D'], [-1, '\uDC36'], [1, '\uDC2F'] -> [-1, '\uD83D\uDC36'], [1, '\uD83D\uDC2F']
     *     '\uD83D\uDC36' === '🐶', '\uD83D\uDC2F' === '🐯'
     *
     * @param {Array} diffs Array of diff tuples
     * @return {Array} Array of diff tuples
     */
    function fix_emoji (diffs) {
      var compact = false;
      var starts_with_pair_end = function(str) {
        return str.charCodeAt(0) >= 0xDC00 && str.charCodeAt(0) <= 0xDFFF;
      };
      var ends_with_pair_start = function(str) {
        return str.charCodeAt(str.length-1) >= 0xD800 && str.charCodeAt(str.length-1) <= 0xDBFF;
      };
      for (var i = 2; i < diffs.length; i += 1) {
        if (diffs[i-2][0] === DIFF_EQUAL && ends_with_pair_start(diffs[i-2][1]) &&
            diffs[i-1][0] === DIFF_DELETE && starts_with_pair_end(diffs[i-1][1]) &&
            diffs[i][0] === DIFF_INSERT && starts_with_pair_end(diffs[i][1])) {
          compact = true;

          diffs[i-1][1] = diffs[i-2][1].slice(-1) + diffs[i-1][1];
          diffs[i][1] = diffs[i-2][1].slice(-1) + diffs[i][1];

          diffs[i-2][1] = diffs[i-2][1].slice(0, -1);
        }
      }
      if (!compact) {
        return diffs;
      }
      var fixed_diffs = [];
      for (var i = 0; i < diffs.length; i += 1) {
        if (diffs[i][1].length > 0) {
          fixed_diffs.push(diffs[i]);
        }
      }
      return fixed_diffs;
    }

    /*
     * Try to merge tuples with their neigbors in a given range.
     * E.g. [0, 'a'], [0, 'b'] -> [0, 'ab']
     *
     * @param {Array} diffs Array of diff tuples.
     * @param {Int} start Position of the first element to merge (diffs[start] is also merged with diffs[start - 1]).
     * @param {Int} length Number of consecutive elements to check.
     * @return {Array} Array of merged diff tuples.
     */
    function merge_tuples (diffs, start, length) {
      // Check from (start-1) to (start+length).
      for (var i = start + length - 1; i >= 0 && i >= start - 1; i--) {
        if (i + 1 < diffs.length) {
          var left_d = diffs[i];
          var right_d = diffs[i+1];
          if (left_d[0] === right_d[1]) {
            diffs.splice(i, 2, [left_d[0], left_d[1] + right_d[1]]);
          }
        }
      }
      return diffs;
    }


    /***/ }),
    /* 52 */
    /***/ (function(module, exports) {

    exports = module.exports = typeof Object.keys === 'function'
      ? Object.keys : shim;

    exports.shim = shim;
    function shim (obj) {
      var keys = [];
      for (var key in obj) keys.push(key);
      return keys;
    }


    /***/ }),
    /* 53 */
    /***/ (function(module, exports) {

    var supportsArgumentsClass = (function(){
      return Object.prototype.toString.call(arguments)
    })() == '[object Arguments]';

    exports = module.exports = supportsArgumentsClass ? supported : unsupported;

    exports.supported = supported;
    function supported(object) {
      return Object.prototype.toString.call(object) == '[object Arguments]';
    }
    exports.unsupported = unsupported;
    function unsupported(object){
      return object &&
        typeof object == 'object' &&
        typeof object.length == 'number' &&
        Object.prototype.hasOwnProperty.call(object, 'callee') &&
        !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
        false;
    }

    /***/ }),
    /* 54 */
    /***/ (function(module, exports) {

    var has = Object.prototype.hasOwnProperty
      , prefix = '~';

    /**
     * Constructor to create a storage for our `EE` objects.
     * An `Events` instance is a plain object whose properties are event names.
     *
     * @constructor
     * @api private
     */
    function Events() {}

    //
    // We try to not inherit from `Object.prototype`. In some engines creating an
    // instance in this way is faster than calling `Object.create(null)` directly.
    // If `Object.create(null)` is not supported we prefix the event names with a
    // character to make sure that the built-in object properties are not
    // overridden or used as an attack vector.
    //
    if (Object.create) {
      Events.prototype = Object.create(null);

      //
      // This hack is needed because the `__proto__` property is still inherited in
      // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
      //
      if (!new Events().__proto__) prefix = false;
    }

    /**
     * Representation of a single event listener.
     *
     * @param {Function} fn The listener function.
     * @param {Mixed} context The context to invoke the listener with.
     * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
     * @constructor
     * @api private
     */
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }

    /**
     * Minimal `EventEmitter` interface that is molded against the Node.js
     * `EventEmitter` interface.
     *
     * @constructor
     * @api public
     */
    function EventEmitter() {
      this._events = new Events();
      this._eventsCount = 0;
    }

    /**
     * Return an array listing the events for which the emitter has registered
     * listeners.
     *
     * @returns {Array}
     * @api public
     */
    EventEmitter.prototype.eventNames = function eventNames() {
      var names = []
        , events
        , name;

      if (this._eventsCount === 0) return names;

      for (name in (events = this._events)) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }

      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }

      return names;
    };

    /**
     * Return the listeners registered for a given event.
     *
     * @param {String|Symbol} event The event name.
     * @param {Boolean} exists Only check if there are listeners.
     * @returns {Array|Boolean}
     * @api public
     */
    EventEmitter.prototype.listeners = function listeners(event, exists) {
      var evt = prefix ? prefix + event : event
        , available = this._events[evt];

      if (exists) return !!available;
      if (!available) return [];
      if (available.fn) return [available.fn];

      for (var i = 0, l = available.length, ee = new Array(l); i < l; i++) {
        ee[i] = available[i].fn;
      }

      return ee;
    };

    /**
     * Calls each of the listeners registered for a given event.
     *
     * @param {String|Symbol} event The event name.
     * @returns {Boolean} `true` if the event had listeners, else `false`.
     * @api public
     */
    EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;

      if (!this._events[evt]) return false;

      var listeners = this._events[evt]
        , len = arguments.length
        , args
        , i;

      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

        switch (len) {
          case 1: return listeners.fn.call(listeners.context), true;
          case 2: return listeners.fn.call(listeners.context, a1), true;
          case 3: return listeners.fn.call(listeners.context, a1, a2), true;
          case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }

        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments[i];
        }

        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length
          , j;

        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

          switch (len) {
            case 1: listeners[i].fn.call(listeners[i].context); break;
            case 2: listeners[i].fn.call(listeners[i].context, a1); break;
            case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
            case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
            default:
              if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
                args[j - 1] = arguments[j];
              }

              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }

      return true;
    };

    /**
     * Add a listener for a given event.
     *
     * @param {String|Symbol} event The event name.
     * @param {Function} fn The listener function.
     * @param {Mixed} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @api public
     */
    EventEmitter.prototype.on = function on(event, fn, context) {
      var listener = new EE(fn, context || this)
        , evt = prefix ? prefix + event : event;

      if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
      else if (!this._events[evt].fn) this._events[evt].push(listener);
      else this._events[evt] = [this._events[evt], listener];

      return this;
    };

    /**
     * Add a one-time listener for a given event.
     *
     * @param {String|Symbol} event The event name.
     * @param {Function} fn The listener function.
     * @param {Mixed} [context=this] The context to invoke the listener with.
     * @returns {EventEmitter} `this`.
     * @api public
     */
    EventEmitter.prototype.once = function once(event, fn, context) {
      var listener = new EE(fn, context || this, true)
        , evt = prefix ? prefix + event : event;

      if (!this._events[evt]) this._events[evt] = listener, this._eventsCount++;
      else if (!this._events[evt].fn) this._events[evt].push(listener);
      else this._events[evt] = [this._events[evt], listener];

      return this;
    };

    /**
     * Remove the listeners of a given event.
     *
     * @param {String|Symbol} event The event name.
     * @param {Function} fn Only remove the listeners that match this function.
     * @param {Mixed} context Only remove the listeners that have this context.
     * @param {Boolean} once Only remove one-time listeners.
     * @returns {EventEmitter} `this`.
     * @api public
     */
    EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;

      if (!this._events[evt]) return this;
      if (!fn) {
        if (--this._eventsCount === 0) this._events = new Events();
        else delete this._events[evt];
        return this;
      }

      var listeners = this._events[evt];

      if (listeners.fn) {
        if (
             listeners.fn === fn
          && (!once || listeners.once)
          && (!context || listeners.context === context)
        ) {
          if (--this._eventsCount === 0) this._events = new Events();
          else delete this._events[evt];
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (
               listeners[i].fn !== fn
            || (once && !listeners[i].once)
            || (context && listeners[i].context !== context)
          ) {
            events.push(listeners[i]);
          }
        }

        //
        // Reset the array, or remove it completely if we have no more listeners.
        //
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else if (--this._eventsCount === 0) this._events = new Events();
        else delete this._events[evt];
      }

      return this;
    };

    /**
     * Remove all listeners, or those of the specified event.
     *
     * @param {String|Symbol} [event] The event name.
     * @returns {EventEmitter} `this`.
     * @api public
     */
    EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;

      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) {
          if (--this._eventsCount === 0) this._events = new Events();
          else delete this._events[evt];
        }
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }

      return this;
    };

    //
    // Alias methods names because people roll like that.
    //
    EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;

    //
    // This function doesn't apply anymore.
    //
    EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
      return this;
    };

    //
    // Expose the prefix.
    //
    EventEmitter.prefixed = prefix;

    //
    // Allow `EventEmitter` to be imported as module namespace.
    //
    EventEmitter.EventEmitter = EventEmitter;

    //
    // Expose the module.
    //
    if ('undefined' !== typeof module) {
      module.exports = EventEmitter;
    }


    /***/ }),
    /* 55 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.matchText = exports.matchSpacing = exports.matchNewline = exports.matchBlot = exports.matchAttributor = exports.default = undefined;

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _extend2 = __webpack_require__(3);

    var _extend3 = _interopRequireDefault(_extend2);

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _logger = __webpack_require__(10);

    var _logger2 = _interopRequireDefault(_logger);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    var _align = __webpack_require__(36);

    var _background = __webpack_require__(37);

    var _code = __webpack_require__(13);

    var _code2 = _interopRequireDefault(_code);

    var _color = __webpack_require__(26);

    var _direction = __webpack_require__(38);

    var _font = __webpack_require__(39);

    var _size = __webpack_require__(40);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var debug = (0, _logger2.default)('quill:clipboard');

    var DOM_KEY = '__ql-matcher';

    var CLIPBOARD_CONFIG = [[Node.TEXT_NODE, matchText], [Node.TEXT_NODE, matchNewline], ['br', matchBreak], [Node.ELEMENT_NODE, matchNewline], [Node.ELEMENT_NODE, matchBlot], [Node.ELEMENT_NODE, matchSpacing], [Node.ELEMENT_NODE, matchAttributor], [Node.ELEMENT_NODE, matchStyles], ['li', matchIndent], ['b', matchAlias.bind(matchAlias, 'bold')], ['i', matchAlias.bind(matchAlias, 'italic')], ['style', matchIgnore]];

    var ATTRIBUTE_ATTRIBUTORS = [_align.AlignAttribute, _direction.DirectionAttribute].reduce(function (memo, attr) {
      memo[attr.keyName] = attr;
      return memo;
    }, {});

    var STYLE_ATTRIBUTORS = [_align.AlignStyle, _background.BackgroundStyle, _color.ColorStyle, _direction.DirectionStyle, _font.FontStyle, _size.SizeStyle].reduce(function (memo, attr) {
      memo[attr.keyName] = attr;
      return memo;
    }, {});

    var Clipboard = function (_Module) {
      _inherits(Clipboard, _Module);

      function Clipboard(quill, options) {
        _classCallCheck(this, Clipboard);

        var _this = _possibleConstructorReturn(this, (Clipboard.__proto__ || Object.getPrototypeOf(Clipboard)).call(this, quill, options));

        _this.quill.root.addEventListener('paste', _this.onPaste.bind(_this));
        _this.container = _this.quill.addContainer('ql-clipboard');
        _this.container.setAttribute('contenteditable', true);
        _this.container.setAttribute('tabindex', -1);
        _this.matchers = [];
        CLIPBOARD_CONFIG.concat(_this.options.matchers).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              selector = _ref2[0],
              matcher = _ref2[1];

          if (!options.matchVisual && matcher === matchSpacing) return;
          _this.addMatcher(selector, matcher);
        });
        return _this;
      }

      _createClass(Clipboard, [{
        key: 'addMatcher',
        value: function addMatcher(selector, matcher) {
          this.matchers.push([selector, matcher]);
        }
      }, {
        key: 'convert',
        value: function convert(html) {
          if (typeof html === 'string') {
            this.container.innerHTML = html.replace(/\>\r?\n +\</g, '><'); // Remove spaces between tags
            return this.convert();
          }
          var formats = this.quill.getFormat(this.quill.selection.savedRange.index);
          if (formats[_code2.default.blotName]) {
            var text = this.container.innerText;
            this.container.innerHTML = '';
            return new _quillDelta2.default().insert(text, _defineProperty({}, _code2.default.blotName, formats[_code2.default.blotName]));
          }

          var _prepareMatching = this.prepareMatching(),
              _prepareMatching2 = _slicedToArray(_prepareMatching, 2),
              elementMatchers = _prepareMatching2[0],
              textMatchers = _prepareMatching2[1];

          var delta = traverse(this.container, elementMatchers, textMatchers);
          // Remove trailing newline
          if (deltaEndsWith(delta, '\n') && delta.ops[delta.ops.length - 1].attributes == null) {
            delta = delta.compose(new _quillDelta2.default().retain(delta.length() - 1).delete(1));
          }
          debug.log('convert', this.container.innerHTML, delta);
          this.container.innerHTML = '';
          return delta;
        }
      }, {
        key: 'dangerouslyPasteHTML',
        value: function dangerouslyPasteHTML(index, html) {
          var source = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : _quill2.default.sources.API;

          if (typeof index === 'string') {
            this.quill.setContents(this.convert(index), html);
            this.quill.setSelection(0, _quill2.default.sources.SILENT);
          } else {
            var paste = this.convert(html);
            this.quill.updateContents(new _quillDelta2.default().retain(index).concat(paste), source);
            this.quill.setSelection(index + paste.length(), _quill2.default.sources.SILENT);
          }
        }
      }, {
        key: 'onPaste',
        value: function onPaste(e) {
          var _this2 = this;

          if (e.defaultPrevented || !this.quill.isEnabled()) return;
          var range = this.quill.getSelection();
          var delta = new _quillDelta2.default().retain(range.index);
          var scrollTop = this.quill.scrollingContainer.scrollTop;
          this.container.focus();
          this.quill.selection.update(_quill2.default.sources.SILENT);
          setTimeout(function () {
            delta = delta.concat(_this2.convert()).delete(range.length);
            _this2.quill.updateContents(delta, _quill2.default.sources.USER);
            // range.length contributes to delta.length()
            _this2.quill.setSelection(delta.length() - range.length, _quill2.default.sources.SILENT);
            _this2.quill.scrollingContainer.scrollTop = scrollTop;
            _this2.quill.focus();
          }, 1);
        }
      }, {
        key: 'prepareMatching',
        value: function prepareMatching() {
          var _this3 = this;

          var elementMatchers = [],
              textMatchers = [];
          this.matchers.forEach(function (pair) {
            var _pair = _slicedToArray(pair, 2),
                selector = _pair[0],
                matcher = _pair[1];

            switch (selector) {
              case Node.TEXT_NODE:
                textMatchers.push(matcher);
                break;
              case Node.ELEMENT_NODE:
                elementMatchers.push(matcher);
                break;
              default:
                [].forEach.call(_this3.container.querySelectorAll(selector), function (node) {
                  // TODO use weakmap
                  node[DOM_KEY] = node[DOM_KEY] || [];
                  node[DOM_KEY].push(matcher);
                });
                break;
            }
          });
          return [elementMatchers, textMatchers];
        }
      }]);

      return Clipboard;
    }(_module2.default);

    Clipboard.DEFAULTS = {
      matchers: [],
      matchVisual: true
    };

    function applyFormat(delta, format, value) {
      if ((typeof format === 'undefined' ? 'undefined' : _typeof(format)) === 'object') {
        return Object.keys(format).reduce(function (delta, key) {
          return applyFormat(delta, key, format[key]);
        }, delta);
      } else {
        return delta.reduce(function (delta, op) {
          if (op.attributes && op.attributes[format]) {
            return delta.push(op);
          } else {
            return delta.insert(op.insert, (0, _extend3.default)({}, _defineProperty({}, format, value), op.attributes));
          }
        }, new _quillDelta2.default());
      }
    }

    function computeStyle(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return {};
      var DOM_KEY = '__ql-computed-style';
      return node[DOM_KEY] || (node[DOM_KEY] = window.getComputedStyle(node));
    }

    function deltaEndsWith(delta, text) {
      var endText = "";
      for (var i = delta.ops.length - 1; i >= 0 && endText.length < text.length; --i) {
        var op = delta.ops[i];
        if (typeof op.insert !== 'string') break;
        endText = op.insert + endText;
      }
      return endText.slice(-1 * text.length) === text;
    }

    function isLine(node) {
      if (node.childNodes.length === 0) return false; // Exclude embed blocks
      var style = computeStyle(node);
      return ['block', 'list-item'].indexOf(style.display) > -1;
    }

    function traverse(node, elementMatchers, textMatchers) {
      // Post-order
      if (node.nodeType === node.TEXT_NODE) {
        return textMatchers.reduce(function (delta, matcher) {
          return matcher(node, delta);
        }, new _quillDelta2.default());
      } else if (node.nodeType === node.ELEMENT_NODE) {
        return [].reduce.call(node.childNodes || [], function (delta, childNode) {
          var childrenDelta = traverse(childNode, elementMatchers, textMatchers);
          if (childNode.nodeType === node.ELEMENT_NODE) {
            childrenDelta = elementMatchers.reduce(function (childrenDelta, matcher) {
              return matcher(childNode, childrenDelta);
            }, childrenDelta);
            childrenDelta = (childNode[DOM_KEY] || []).reduce(function (childrenDelta, matcher) {
              return matcher(childNode, childrenDelta);
            }, childrenDelta);
          }
          return delta.concat(childrenDelta);
        }, new _quillDelta2.default());
      } else {
        return new _quillDelta2.default();
      }
    }

    function matchAlias(format, node, delta) {
      return applyFormat(delta, format, true);
    }

    function matchAttributor(node, delta) {
      var attributes = _parchment2.default.Attributor.Attribute.keys(node);
      var classes = _parchment2.default.Attributor.Class.keys(node);
      var styles = _parchment2.default.Attributor.Style.keys(node);
      var formats = {};
      attributes.concat(classes).concat(styles).forEach(function (name) {
        var attr = _parchment2.default.query(name, _parchment2.default.Scope.ATTRIBUTE);
        if (attr != null) {
          formats[attr.attrName] = attr.value(node);
          if (formats[attr.attrName]) return;
        }
        attr = ATTRIBUTE_ATTRIBUTORS[name];
        if (attr != null && (attr.attrName === name || attr.keyName === name)) {
          formats[attr.attrName] = attr.value(node) || undefined;
        }
        attr = STYLE_ATTRIBUTORS[name];
        if (attr != null && (attr.attrName === name || attr.keyName === name)) {
          attr = STYLE_ATTRIBUTORS[name];
          formats[attr.attrName] = attr.value(node) || undefined;
        }
      });
      if (Object.keys(formats).length > 0) {
        delta = applyFormat(delta, formats);
      }
      return delta;
    }

    function matchBlot(node, delta) {
      var match = _parchment2.default.query(node);
      if (match == null) return delta;
      if (match.prototype instanceof _parchment2.default.Embed) {
        var embed = {};
        var value = match.value(node);
        if (value != null) {
          embed[match.blotName] = value;
          delta = new _quillDelta2.default().insert(embed, match.formats(node));
        }
      } else if (typeof match.formats === 'function') {
        delta = applyFormat(delta, match.blotName, match.formats(node));
      }
      return delta;
    }

    function matchBreak(node, delta) {
      if (!deltaEndsWith(delta, '\n')) {
        delta.insert('\n');
      }
      return delta;
    }

    function matchIgnore() {
      return new _quillDelta2.default();
    }

    function matchIndent(node, delta) {
      var match = _parchment2.default.query(node);
      if (match == null || match.blotName !== 'list-item' || !deltaEndsWith(delta, '\n')) {
        return delta;
      }
      var indent = -1,
          parent = node.parentNode;
      while (!parent.classList.contains('ql-clipboard')) {
        if ((_parchment2.default.query(parent) || {}).blotName === 'list') {
          indent += 1;
        }
        parent = parent.parentNode;
      }
      if (indent <= 0) return delta;
      return delta.compose(new _quillDelta2.default().retain(delta.length() - 1).retain(1, { indent: indent }));
    }

    function matchNewline(node, delta) {
      if (!deltaEndsWith(delta, '\n')) {
        if (isLine(node) || delta.length() > 0 && node.nextSibling && isLine(node.nextSibling)) {
          delta.insert('\n');
        }
      }
      return delta;
    }

    function matchSpacing(node, delta) {
      if (isLine(node) && node.nextElementSibling != null && !deltaEndsWith(delta, '\n\n')) {
        var nodeHeight = node.offsetHeight + parseFloat(computeStyle(node).marginTop) + parseFloat(computeStyle(node).marginBottom);
        if (node.nextElementSibling.offsetTop > node.offsetTop + nodeHeight * 1.5) {
          delta.insert('\n');
        }
      }
      return delta;
    }

    function matchStyles(node, delta) {
      var formats = {};
      var style = node.style || {};
      if (style.fontStyle && computeStyle(node).fontStyle === 'italic') {
        formats.italic = true;
      }
      if (style.fontWeight && (computeStyle(node).fontWeight.startsWith('bold') || parseInt(computeStyle(node).fontWeight) >= 700)) {
        formats.bold = true;
      }
      if (Object.keys(formats).length > 0) {
        delta = applyFormat(delta, formats);
      }
      if (parseFloat(style.textIndent || 0) > 0) {
        // Could be 0.5in
        delta = new _quillDelta2.default().insert('\t').concat(delta);
      }
      return delta;
    }

    function matchText(node, delta) {
      var text = node.data;
      // Word represents empty line with <o:p>&nbsp;</o:p>
      if (node.parentNode.tagName === 'O:P') {
        return delta.insert(text.trim());
      }
      if (text.trim().length === 0 && node.parentNode.classList.contains('ql-clipboard')) {
        return delta;
      }
      if (!computeStyle(node.parentNode).whiteSpace.startsWith('pre')) {
        // eslint-disable-next-line func-style
        var replacer = function replacer(collapse, match) {
          match = match.replace(/[^\u00a0]/g, ''); // \u00a0 is nbsp;
          return match.length < 1 && collapse ? ' ' : match;
        };
        text = text.replace(/\r\n/g, ' ').replace(/\n/g, ' ');
        text = text.replace(/\s\s+/g, replacer.bind(replacer, true)); // collapse whitespace
        if (node.previousSibling == null && isLine(node.parentNode) || node.previousSibling != null && isLine(node.previousSibling)) {
          text = text.replace(/^\s+/, replacer.bind(replacer, false));
        }
        if (node.nextSibling == null && isLine(node.parentNode) || node.nextSibling != null && isLine(node.nextSibling)) {
          text = text.replace(/\s+$/, replacer.bind(replacer, false));
        }
      }
      return delta.insert(text);
    }

    exports.default = Clipboard;
    exports.matchAttributor = matchAttributor;
    exports.matchBlot = matchBlot;
    exports.matchNewline = matchNewline;
    exports.matchSpacing = matchSpacing;
    exports.matchText = matchText;

    /***/ }),
    /* 56 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Bold = function (_Inline) {
      _inherits(Bold, _Inline);

      function Bold() {
        _classCallCheck(this, Bold);

        return _possibleConstructorReturn(this, (Bold.__proto__ || Object.getPrototypeOf(Bold)).apply(this, arguments));
      }

      _createClass(Bold, [{
        key: 'optimize',
        value: function optimize(context) {
          _get(Bold.prototype.__proto__ || Object.getPrototypeOf(Bold.prototype), 'optimize', this).call(this, context);
          if (this.domNode.tagName !== this.statics.tagName[0]) {
            this.replaceWith(this.statics.blotName);
          }
        }
      }], [{
        key: 'create',
        value: function create() {
          return _get(Bold.__proto__ || Object.getPrototypeOf(Bold), 'create', this).call(this);
        }
      }, {
        key: 'formats',
        value: function formats() {
          return true;
        }
      }]);

      return Bold;
    }(_inline2.default);

    Bold.blotName = 'bold';
    Bold.tagName = ['STRONG', 'B'];

    exports.default = Bold;

    /***/ }),
    /* 57 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.addControls = exports.default = undefined;

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _quillDelta = __webpack_require__(2);

    var _quillDelta2 = _interopRequireDefault(_quillDelta);

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _logger = __webpack_require__(10);

    var _logger2 = _interopRequireDefault(_logger);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var debug = (0, _logger2.default)('quill:toolbar');

    var Toolbar = function (_Module) {
      _inherits(Toolbar, _Module);

      function Toolbar(quill, options) {
        _classCallCheck(this, Toolbar);

        var _this = _possibleConstructorReturn(this, (Toolbar.__proto__ || Object.getPrototypeOf(Toolbar)).call(this, quill, options));

        if (Array.isArray(_this.options.container)) {
          var container = document.createElement('div');
          addControls(container, _this.options.container);
          quill.container.parentNode.insertBefore(container, quill.container);
          _this.container = container;
        } else if (typeof _this.options.container === 'string') {
          _this.container = document.querySelector(_this.options.container);
        } else {
          _this.container = _this.options.container;
        }
        if (!(_this.container instanceof HTMLElement)) {
          var _ret;

          return _ret = debug.error('Container required for toolbar', _this.options), _possibleConstructorReturn(_this, _ret);
        }
        _this.container.classList.add('ql-toolbar');
        _this.controls = [];
        _this.handlers = {};
        Object.keys(_this.options.handlers).forEach(function (format) {
          _this.addHandler(format, _this.options.handlers[format]);
        });
        [].forEach.call(_this.container.querySelectorAll('button, select'), function (input) {
          _this.attach(input);
        });
        _this.quill.on(_quill2.default.events.EDITOR_CHANGE, function (type, range) {
          if (type === _quill2.default.events.SELECTION_CHANGE) {
            _this.update(range);
          }
        });
        _this.quill.on(_quill2.default.events.SCROLL_OPTIMIZE, function () {
          var _this$quill$selection = _this.quill.selection.getRange(),
              _this$quill$selection2 = _slicedToArray(_this$quill$selection, 1),
              range = _this$quill$selection2[0]; // quill.getSelection triggers update


          _this.update(range);
        });
        return _this;
      }

      _createClass(Toolbar, [{
        key: 'addHandler',
        value: function addHandler(format, handler) {
          this.handlers[format] = handler;
        }
      }, {
        key: 'attach',
        value: function attach(input) {
          var _this2 = this;

          var format = [].find.call(input.classList, function (className) {
            return className.indexOf('ql-') === 0;
          });
          if (!format) return;
          format = format.slice('ql-'.length);
          if (input.tagName === 'BUTTON') {
            input.setAttribute('type', 'button');
          }
          if (this.handlers[format] == null) {
            if (this.quill.scroll.whitelist != null && this.quill.scroll.whitelist[format] == null) {
              debug.warn('ignoring attaching to disabled format', format, input);
              return;
            }
            if (_parchment2.default.query(format) == null) {
              debug.warn('ignoring attaching to nonexistent format', format, input);
              return;
            }
          }
          var eventName = input.tagName === 'SELECT' ? 'change' : 'click';
          input.addEventListener(eventName, function (e) {
            var value = void 0;
            if (input.tagName === 'SELECT') {
              if (input.selectedIndex < 0) return;
              var selected = input.options[input.selectedIndex];
              if (selected.hasAttribute('selected')) {
                value = false;
              } else {
                value = selected.value || false;
              }
            } else {
              if (input.classList.contains('ql-active')) {
                value = false;
              } else {
                value = input.value || !input.hasAttribute('value');
              }
              e.preventDefault();
            }
            _this2.quill.focus();

            var _quill$selection$getR = _this2.quill.selection.getRange(),
                _quill$selection$getR2 = _slicedToArray(_quill$selection$getR, 1),
                range = _quill$selection$getR2[0];

            if (_this2.handlers[format] != null) {
              _this2.handlers[format].call(_this2, value);
            } else if (_parchment2.default.query(format).prototype instanceof _parchment2.default.Embed) {
              value = prompt('Enter ' + format);
              if (!value) return;
              _this2.quill.updateContents(new _quillDelta2.default().retain(range.index).delete(range.length).insert(_defineProperty({}, format, value)), _quill2.default.sources.USER);
            } else {
              _this2.quill.format(format, value, _quill2.default.sources.USER);
            }
            _this2.update(range);
          });
          // TODO use weakmap
          this.controls.push([format, input]);
        }
      }, {
        key: 'update',
        value: function update(range) {
          var formats = range == null ? {} : this.quill.getFormat(range);
          this.controls.forEach(function (pair) {
            var _pair = _slicedToArray(pair, 2),
                format = _pair[0],
                input = _pair[1];

            if (input.tagName === 'SELECT') {
              var option = void 0;
              if (range == null) {
                option = null;
              } else if (formats[format] == null) {
                option = input.querySelector('option[selected]');
              } else if (!Array.isArray(formats[format])) {
                var value = formats[format];
                if (typeof value === 'string') {
                  value = value.replace(/\"/g, '\\"');
                }
                option = input.querySelector('option[value="' + value + '"]');
              }
              if (option == null) {
                input.value = ''; // TODO make configurable?
                input.selectedIndex = -1;
              } else {
                option.selected = true;
              }
            } else {
              if (range == null) {
                input.classList.remove('ql-active');
              } else if (input.hasAttribute('value')) {
                // both being null should match (default values)
                // '1' should match with 1 (headers)
                var isActive = formats[format] === input.getAttribute('value') || formats[format] != null && formats[format].toString() === input.getAttribute('value') || formats[format] == null && !input.getAttribute('value');
                input.classList.toggle('ql-active', isActive);
              } else {
                input.classList.toggle('ql-active', formats[format] != null);
              }
            }
          });
        }
      }]);

      return Toolbar;
    }(_module2.default);

    Toolbar.DEFAULTS = {};

    function addButton(container, format, value) {
      var input = document.createElement('button');
      input.setAttribute('type', 'button');
      input.classList.add('ql-' + format);
      if (value != null) {
        input.value = value;
      }
      container.appendChild(input);
    }

    function addControls(container, groups) {
      if (!Array.isArray(groups[0])) {
        groups = [groups];
      }
      groups.forEach(function (controls) {
        var group = document.createElement('span');
        group.classList.add('ql-formats');
        controls.forEach(function (control) {
          if (typeof control === 'string') {
            addButton(group, control);
          } else {
            var format = Object.keys(control)[0];
            var value = control[format];
            if (Array.isArray(value)) {
              addSelect(group, format, value);
            } else {
              addButton(group, format, value);
            }
          }
        });
        container.appendChild(group);
      });
    }

    function addSelect(container, format, values) {
      var input = document.createElement('select');
      input.classList.add('ql-' + format);
      values.forEach(function (value) {
        var option = document.createElement('option');
        if (value !== false) {
          option.setAttribute('value', value);
        } else {
          option.setAttribute('selected', 'selected');
        }
        input.appendChild(option);
      });
      container.appendChild(input);
    }

    Toolbar.DEFAULTS = {
      container: null,
      handlers: {
        clean: function clean() {
          var _this3 = this;

          var range = this.quill.getSelection();
          if (range == null) return;
          if (range.length == 0) {
            var formats = this.quill.getFormat();
            Object.keys(formats).forEach(function (name) {
              // Clean functionality in existing apps only clean inline formats
              if (_parchment2.default.query(name, _parchment2.default.Scope.INLINE) != null) {
                _this3.quill.format(name, false);
              }
            });
          } else {
            this.quill.removeFormat(range, _quill2.default.sources.USER);
          }
        },
        direction: function direction(value) {
          var align = this.quill.getFormat()['align'];
          if (value === 'rtl' && align == null) {
            this.quill.format('align', 'right', _quill2.default.sources.USER);
          } else if (!value && align === 'right') {
            this.quill.format('align', false, _quill2.default.sources.USER);
          }
          this.quill.format('direction', value, _quill2.default.sources.USER);
        },
        indent: function indent(value) {
          var range = this.quill.getSelection();
          var formats = this.quill.getFormat(range);
          var indent = parseInt(formats.indent || 0);
          if (value === '+1' || value === '-1') {
            var modifier = value === '+1' ? 1 : -1;
            if (formats.direction === 'rtl') modifier *= -1;
            this.quill.format('indent', indent + modifier, _quill2.default.sources.USER);
          }
        },
        link: function link(value) {
          if (value === true) {
            value = prompt('Enter link URL:');
          }
          this.quill.format('link', value, _quill2.default.sources.USER);
        },
        list: function list(value) {
          var range = this.quill.getSelection();
          var formats = this.quill.getFormat(range);
          if (value === 'check') {
            if (formats['list'] === 'checked' || formats['list'] === 'unchecked') {
              this.quill.format('list', false, _quill2.default.sources.USER);
            } else {
              this.quill.format('list', 'unchecked', _quill2.default.sources.USER);
            }
          } else {
            this.quill.format('list', value, _quill2.default.sources.USER);
          }
        }
      }
    };

    exports.default = Toolbar;
    exports.addControls = addControls;

    /***/ }),
    /* 58 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <polyline class=\"ql-even ql-stroke\" points=\"5 7 3 9 5 11\"></polyline> <polyline class=\"ql-even ql-stroke\" points=\"13 7 15 9 13 11\"></polyline> <line class=ql-stroke x1=10 x2=8 y1=5 y2=13></line> </svg>";

    /***/ }),
    /* 59 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _picker = __webpack_require__(28);

    var _picker2 = _interopRequireDefault(_picker);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var ColorPicker = function (_Picker) {
      _inherits(ColorPicker, _Picker);

      function ColorPicker(select, label) {
        _classCallCheck(this, ColorPicker);

        var _this = _possibleConstructorReturn(this, (ColorPicker.__proto__ || Object.getPrototypeOf(ColorPicker)).call(this, select));

        _this.label.innerHTML = label;
        _this.container.classList.add('ql-color-picker');
        [].slice.call(_this.container.querySelectorAll('.ql-picker-item'), 0, 7).forEach(function (item) {
          item.classList.add('ql-primary');
        });
        return _this;
      }

      _createClass(ColorPicker, [{
        key: 'buildItem',
        value: function buildItem(option) {
          var item = _get(ColorPicker.prototype.__proto__ || Object.getPrototypeOf(ColorPicker.prototype), 'buildItem', this).call(this, option);
          item.style.backgroundColor = option.getAttribute('value') || '';
          return item;
        }
      }, {
        key: 'selectItem',
        value: function selectItem(item, trigger) {
          _get(ColorPicker.prototype.__proto__ || Object.getPrototypeOf(ColorPicker.prototype), 'selectItem', this).call(this, item, trigger);
          var colorLabel = this.label.querySelector('.ql-color-label');
          var value = item ? item.getAttribute('data-value') || '' : '';
          if (colorLabel) {
            if (colorLabel.tagName === 'line') {
              colorLabel.style.stroke = value;
            } else {
              colorLabel.style.fill = value;
            }
          }
        }
      }]);

      return ColorPicker;
    }(_picker2.default);

    exports.default = ColorPicker;

    /***/ }),
    /* 60 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _picker = __webpack_require__(28);

    var _picker2 = _interopRequireDefault(_picker);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var IconPicker = function (_Picker) {
      _inherits(IconPicker, _Picker);

      function IconPicker(select, icons) {
        _classCallCheck(this, IconPicker);

        var _this = _possibleConstructorReturn(this, (IconPicker.__proto__ || Object.getPrototypeOf(IconPicker)).call(this, select));

        _this.container.classList.add('ql-icon-picker');
        [].forEach.call(_this.container.querySelectorAll('.ql-picker-item'), function (item) {
          item.innerHTML = icons[item.getAttribute('data-value') || ''];
        });
        _this.defaultItem = _this.container.querySelector('.ql-selected');
        _this.selectItem(_this.defaultItem);
        return _this;
      }

      _createClass(IconPicker, [{
        key: 'selectItem',
        value: function selectItem(item, trigger) {
          _get(IconPicker.prototype.__proto__ || Object.getPrototypeOf(IconPicker.prototype), 'selectItem', this).call(this, item, trigger);
          item = item || this.defaultItem;
          this.label.innerHTML = item.innerHTML;
        }
      }]);

      return IconPicker;
    }(_picker2.default);

    exports.default = IconPicker;

    /***/ }),
    /* 61 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    var Tooltip = function () {
      function Tooltip(quill, boundsContainer) {
        var _this = this;

        _classCallCheck(this, Tooltip);

        this.quill = quill;
        this.boundsContainer = boundsContainer || document.body;
        this.root = quill.addContainer('ql-tooltip');
        this.root.innerHTML = this.constructor.TEMPLATE;
        if (this.quill.root === this.quill.scrollingContainer) {
          this.quill.root.addEventListener('scroll', function () {
            _this.root.style.marginTop = -1 * _this.quill.root.scrollTop + 'px';
          });
        }
        this.hide();
      }

      _createClass(Tooltip, [{
        key: 'hide',
        value: function hide() {
          this.root.classList.add('ql-hidden');
        }
      }, {
        key: 'position',
        value: function position(reference) {
          var left = reference.left + reference.width / 2 - this.root.offsetWidth / 2;
          // root.scrollTop should be 0 if scrollContainer !== root
          var top = reference.bottom + this.quill.root.scrollTop;
          this.root.style.left = left + 'px';
          this.root.style.top = top + 'px';
          this.root.classList.remove('ql-flip');
          var containerBounds = this.boundsContainer.getBoundingClientRect();
          var rootBounds = this.root.getBoundingClientRect();
          var shift = 0;
          if (rootBounds.right > containerBounds.right) {
            shift = containerBounds.right - rootBounds.right;
            this.root.style.left = left + shift + 'px';
          }
          if (rootBounds.left < containerBounds.left) {
            shift = containerBounds.left - rootBounds.left;
            this.root.style.left = left + shift + 'px';
          }
          if (rootBounds.bottom > containerBounds.bottom) {
            var height = rootBounds.bottom - rootBounds.top;
            var verticalShift = reference.bottom - reference.top + height;
            this.root.style.top = top - verticalShift + 'px';
            this.root.classList.add('ql-flip');
          }
          return shift;
        }
      }, {
        key: 'show',
        value: function show() {
          this.root.classList.remove('ql-editing');
          this.root.classList.remove('ql-hidden');
        }
      }]);

      return Tooltip;
    }();

    exports.default = Tooltip;

    /***/ }),
    /* 62 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    var _emitter = __webpack_require__(8);

    var _emitter2 = _interopRequireDefault(_emitter);

    var _base = __webpack_require__(43);

    var _base2 = _interopRequireDefault(_base);

    var _link = __webpack_require__(27);

    var _link2 = _interopRequireDefault(_link);

    var _selection = __webpack_require__(15);

    var _icons = __webpack_require__(41);

    var _icons2 = _interopRequireDefault(_icons);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var TOOLBAR_CONFIG = [[{ header: ['1', '2', '3', false] }], ['bold', 'italic', 'underline', 'link'], [{ list: 'ordered' }, { list: 'bullet' }], ['clean']];

    var SnowTheme = function (_BaseTheme) {
      _inherits(SnowTheme, _BaseTheme);

      function SnowTheme(quill, options) {
        _classCallCheck(this, SnowTheme);

        if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
          options.modules.toolbar.container = TOOLBAR_CONFIG;
        }

        var _this = _possibleConstructorReturn(this, (SnowTheme.__proto__ || Object.getPrototypeOf(SnowTheme)).call(this, quill, options));

        _this.quill.container.classList.add('ql-snow');
        return _this;
      }

      _createClass(SnowTheme, [{
        key: 'extendToolbar',
        value: function extendToolbar(toolbar) {
          toolbar.container.classList.add('ql-snow');
          this.buildButtons([].slice.call(toolbar.container.querySelectorAll('button')), _icons2.default);
          this.buildPickers([].slice.call(toolbar.container.querySelectorAll('select')), _icons2.default);
          this.tooltip = new SnowTooltip(this.quill, this.options.bounds);
          if (toolbar.container.querySelector('.ql-link')) {
            this.quill.keyboard.addBinding({ key: 'K', shortKey: true }, function (range, context) {
              toolbar.handlers['link'].call(toolbar, !context.format.link);
            });
          }
        }
      }]);

      return SnowTheme;
    }(_base2.default);

    SnowTheme.DEFAULTS = (0, _extend2.default)(true, {}, _base2.default.DEFAULTS, {
      modules: {
        toolbar: {
          handlers: {
            link: function link(value) {
              if (value) {
                var range = this.quill.getSelection();
                if (range == null || range.length == 0) return;
                var preview = this.quill.getText(range);
                if (/^\S+@\S+\.\S+$/.test(preview) && preview.indexOf('mailto:') !== 0) {
                  preview = 'mailto:' + preview;
                }
                var tooltip = this.quill.theme.tooltip;
                tooltip.edit('link', preview);
              } else {
                this.quill.format('link', false);
              }
            }
          }
        }
      }
    });

    var SnowTooltip = function (_BaseTooltip) {
      _inherits(SnowTooltip, _BaseTooltip);

      function SnowTooltip(quill, bounds) {
        _classCallCheck(this, SnowTooltip);

        var _this2 = _possibleConstructorReturn(this, (SnowTooltip.__proto__ || Object.getPrototypeOf(SnowTooltip)).call(this, quill, bounds));

        _this2.preview = _this2.root.querySelector('a.ql-preview');
        return _this2;
      }

      _createClass(SnowTooltip, [{
        key: 'listen',
        value: function listen() {
          var _this3 = this;

          _get(SnowTooltip.prototype.__proto__ || Object.getPrototypeOf(SnowTooltip.prototype), 'listen', this).call(this);
          this.root.querySelector('a.ql-action').addEventListener('click', function (event) {
            if (_this3.root.classList.contains('ql-editing')) {
              _this3.save();
            } else {
              _this3.edit('link', _this3.preview.textContent);
            }
            event.preventDefault();
          });
          this.root.querySelector('a.ql-remove').addEventListener('click', function (event) {
            if (_this3.linkRange != null) {
              var range = _this3.linkRange;
              _this3.restoreFocus();
              _this3.quill.formatText(range, 'link', false, _emitter2.default.sources.USER);
              delete _this3.linkRange;
            }
            event.preventDefault();
            _this3.hide();
          });
          this.quill.on(_emitter2.default.events.SELECTION_CHANGE, function (range, oldRange, source) {
            if (range == null) return;
            if (range.length === 0 && source === _emitter2.default.sources.USER) {
              var _quill$scroll$descend = _this3.quill.scroll.descendant(_link2.default, range.index),
                  _quill$scroll$descend2 = _slicedToArray(_quill$scroll$descend, 2),
                  link = _quill$scroll$descend2[0],
                  offset = _quill$scroll$descend2[1];

              if (link != null) {
                _this3.linkRange = new _selection.Range(range.index - offset, link.length());
                var preview = _link2.default.formats(link.domNode);
                _this3.preview.textContent = preview;
                _this3.preview.setAttribute('href', preview);
                _this3.show();
                _this3.position(_this3.quill.getBounds(_this3.linkRange));
                return;
              }
            } else {
              delete _this3.linkRange;
            }
            _this3.hide();
          });
        }
      }, {
        key: 'show',
        value: function show() {
          _get(SnowTooltip.prototype.__proto__ || Object.getPrototypeOf(SnowTooltip.prototype), 'show', this).call(this);
          this.root.removeAttribute('data-mode');
        }
      }]);

      return SnowTooltip;
    }(_base.BaseTooltip);

    SnowTooltip.TEMPLATE = ['<a class="ql-preview" rel="noopener noreferrer" target="_blank" href="about:blank"></a>', '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">', '<a class="ql-action"></a>', '<a class="ql-remove"></a>'].join('');

    exports.default = SnowTheme;

    /***/ }),
    /* 63 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _core = __webpack_require__(29);

    var _core2 = _interopRequireDefault(_core);

    var _align = __webpack_require__(36);

    var _direction = __webpack_require__(38);

    var _indent = __webpack_require__(64);

    var _blockquote = __webpack_require__(65);

    var _blockquote2 = _interopRequireDefault(_blockquote);

    var _header = __webpack_require__(66);

    var _header2 = _interopRequireDefault(_header);

    var _list = __webpack_require__(67);

    var _list2 = _interopRequireDefault(_list);

    var _background = __webpack_require__(37);

    var _color = __webpack_require__(26);

    var _font = __webpack_require__(39);

    var _size = __webpack_require__(40);

    var _bold = __webpack_require__(56);

    var _bold2 = _interopRequireDefault(_bold);

    var _italic = __webpack_require__(68);

    var _italic2 = _interopRequireDefault(_italic);

    var _link = __webpack_require__(27);

    var _link2 = _interopRequireDefault(_link);

    var _script = __webpack_require__(69);

    var _script2 = _interopRequireDefault(_script);

    var _strike = __webpack_require__(70);

    var _strike2 = _interopRequireDefault(_strike);

    var _underline = __webpack_require__(71);

    var _underline2 = _interopRequireDefault(_underline);

    var _image = __webpack_require__(72);

    var _image2 = _interopRequireDefault(_image);

    var _video = __webpack_require__(73);

    var _video2 = _interopRequireDefault(_video);

    var _code = __webpack_require__(13);

    var _code2 = _interopRequireDefault(_code);

    var _formula = __webpack_require__(74);

    var _formula2 = _interopRequireDefault(_formula);

    var _syntax = __webpack_require__(75);

    var _syntax2 = _interopRequireDefault(_syntax);

    var _toolbar = __webpack_require__(57);

    var _toolbar2 = _interopRequireDefault(_toolbar);

    var _icons = __webpack_require__(41);

    var _icons2 = _interopRequireDefault(_icons);

    var _picker = __webpack_require__(28);

    var _picker2 = _interopRequireDefault(_picker);

    var _colorPicker = __webpack_require__(59);

    var _colorPicker2 = _interopRequireDefault(_colorPicker);

    var _iconPicker = __webpack_require__(60);

    var _iconPicker2 = _interopRequireDefault(_iconPicker);

    var _tooltip = __webpack_require__(61);

    var _tooltip2 = _interopRequireDefault(_tooltip);

    var _bubble = __webpack_require__(108);

    var _bubble2 = _interopRequireDefault(_bubble);

    var _snow = __webpack_require__(62);

    var _snow2 = _interopRequireDefault(_snow);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    _core2.default.register({
      'attributors/attribute/direction': _direction.DirectionAttribute,

      'attributors/class/align': _align.AlignClass,
      'attributors/class/background': _background.BackgroundClass,
      'attributors/class/color': _color.ColorClass,
      'attributors/class/direction': _direction.DirectionClass,
      'attributors/class/font': _font.FontClass,
      'attributors/class/size': _size.SizeClass,

      'attributors/style/align': _align.AlignStyle,
      'attributors/style/background': _background.BackgroundStyle,
      'attributors/style/color': _color.ColorStyle,
      'attributors/style/direction': _direction.DirectionStyle,
      'attributors/style/font': _font.FontStyle,
      'attributors/style/size': _size.SizeStyle
    }, true);

    _core2.default.register({
      'formats/align': _align.AlignClass,
      'formats/direction': _direction.DirectionClass,
      'formats/indent': _indent.IndentClass,

      'formats/background': _background.BackgroundStyle,
      'formats/color': _color.ColorStyle,
      'formats/font': _font.FontClass,
      'formats/size': _size.SizeClass,

      'formats/blockquote': _blockquote2.default,
      'formats/code-block': _code2.default,
      'formats/header': _header2.default,
      'formats/list': _list2.default,

      'formats/bold': _bold2.default,
      'formats/code': _code.Code,
      'formats/italic': _italic2.default,
      'formats/link': _link2.default,
      'formats/script': _script2.default,
      'formats/strike': _strike2.default,
      'formats/underline': _underline2.default,

      'formats/image': _image2.default,
      'formats/video': _video2.default,

      'formats/list/item': _list.ListItem,

      'modules/formula': _formula2.default,
      'modules/syntax': _syntax2.default,
      'modules/toolbar': _toolbar2.default,

      'themes/bubble': _bubble2.default,
      'themes/snow': _snow2.default,

      'ui/icons': _icons2.default,
      'ui/picker': _picker2.default,
      'ui/icon-picker': _iconPicker2.default,
      'ui/color-picker': _colorPicker2.default,
      'ui/tooltip': _tooltip2.default
    }, true);

    exports.default = _core2.default;

    /***/ }),
    /* 64 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.IndentClass = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var IdentAttributor = function (_Parchment$Attributor) {
      _inherits(IdentAttributor, _Parchment$Attributor);

      function IdentAttributor() {
        _classCallCheck(this, IdentAttributor);

        return _possibleConstructorReturn(this, (IdentAttributor.__proto__ || Object.getPrototypeOf(IdentAttributor)).apply(this, arguments));
      }

      _createClass(IdentAttributor, [{
        key: 'add',
        value: function add(node, value) {
          if (value === '+1' || value === '-1') {
            var indent = this.value(node) || 0;
            value = value === '+1' ? indent + 1 : indent - 1;
          }
          if (value === 0) {
            this.remove(node);
            return true;
          } else {
            return _get(IdentAttributor.prototype.__proto__ || Object.getPrototypeOf(IdentAttributor.prototype), 'add', this).call(this, node, value);
          }
        }
      }, {
        key: 'canAdd',
        value: function canAdd(node, value) {
          return _get(IdentAttributor.prototype.__proto__ || Object.getPrototypeOf(IdentAttributor.prototype), 'canAdd', this).call(this, node, value) || _get(IdentAttributor.prototype.__proto__ || Object.getPrototypeOf(IdentAttributor.prototype), 'canAdd', this).call(this, node, parseInt(value));
        }
      }, {
        key: 'value',
        value: function value(node) {
          return parseInt(_get(IdentAttributor.prototype.__proto__ || Object.getPrototypeOf(IdentAttributor.prototype), 'value', this).call(this, node)) || undefined; // Don't return NaN
        }
      }]);

      return IdentAttributor;
    }(_parchment2.default.Attributor.Class);

    var IndentClass = new IdentAttributor('indent', 'ql-indent', {
      scope: _parchment2.default.Scope.BLOCK,
      whitelist: [1, 2, 3, 4, 5, 6, 7, 8]
    });

    exports.IndentClass = IndentClass;

    /***/ }),
    /* 65 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Blockquote = function (_Block) {
      _inherits(Blockquote, _Block);

      function Blockquote() {
        _classCallCheck(this, Blockquote);

        return _possibleConstructorReturn(this, (Blockquote.__proto__ || Object.getPrototypeOf(Blockquote)).apply(this, arguments));
      }

      return Blockquote;
    }(_block2.default);

    Blockquote.blotName = 'blockquote';
    Blockquote.tagName = 'blockquote';

    exports.default = Blockquote;

    /***/ }),
    /* 66 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Header = function (_Block) {
      _inherits(Header, _Block);

      function Header() {
        _classCallCheck(this, Header);

        return _possibleConstructorReturn(this, (Header.__proto__ || Object.getPrototypeOf(Header)).apply(this, arguments));
      }

      _createClass(Header, null, [{
        key: 'formats',
        value: function formats(domNode) {
          return this.tagName.indexOf(domNode.tagName) + 1;
        }
      }]);

      return Header;
    }(_block2.default);

    Header.blotName = 'header';
    Header.tagName = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

    exports.default = Header;

    /***/ }),
    /* 67 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.ListItem = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _block = __webpack_require__(4);

    var _block2 = _interopRequireDefault(_block);

    var _container = __webpack_require__(25);

    var _container2 = _interopRequireDefault(_container);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var ListItem = function (_Block) {
      _inherits(ListItem, _Block);

      function ListItem() {
        _classCallCheck(this, ListItem);

        return _possibleConstructorReturn(this, (ListItem.__proto__ || Object.getPrototypeOf(ListItem)).apply(this, arguments));
      }

      _createClass(ListItem, [{
        key: 'format',
        value: function format(name, value) {
          if (name === List.blotName && !value) {
            this.replaceWith(_parchment2.default.create(this.statics.scope));
          } else {
            _get(ListItem.prototype.__proto__ || Object.getPrototypeOf(ListItem.prototype), 'format', this).call(this, name, value);
          }
        }
      }, {
        key: 'remove',
        value: function remove() {
          if (this.prev == null && this.next == null) {
            this.parent.remove();
          } else {
            _get(ListItem.prototype.__proto__ || Object.getPrototypeOf(ListItem.prototype), 'remove', this).call(this);
          }
        }
      }, {
        key: 'replaceWith',
        value: function replaceWith(name, value) {
          this.parent.isolate(this.offset(this.parent), this.length());
          if (name === this.parent.statics.blotName) {
            this.parent.replaceWith(name, value);
            return this;
          } else {
            this.parent.unwrap();
            return _get(ListItem.prototype.__proto__ || Object.getPrototypeOf(ListItem.prototype), 'replaceWith', this).call(this, name, value);
          }
        }
      }], [{
        key: 'formats',
        value: function formats(domNode) {
          return domNode.tagName === this.tagName ? undefined : _get(ListItem.__proto__ || Object.getPrototypeOf(ListItem), 'formats', this).call(this, domNode);
        }
      }]);

      return ListItem;
    }(_block2.default);

    ListItem.blotName = 'list-item';
    ListItem.tagName = 'LI';

    var List = function (_Container) {
      _inherits(List, _Container);

      _createClass(List, null, [{
        key: 'create',
        value: function create(value) {
          var tagName = value === 'ordered' ? 'OL' : 'UL';
          var node = _get(List.__proto__ || Object.getPrototypeOf(List), 'create', this).call(this, tagName);
          if (value === 'checked' || value === 'unchecked') {
            node.setAttribute('data-checked', value === 'checked');
          }
          return node;
        }
      }, {
        key: 'formats',
        value: function formats(domNode) {
          if (domNode.tagName === 'OL') return 'ordered';
          if (domNode.tagName === 'UL') {
            if (domNode.hasAttribute('data-checked')) {
              return domNode.getAttribute('data-checked') === 'true' ? 'checked' : 'unchecked';
            } else {
              return 'bullet';
            }
          }
          return undefined;
        }
      }]);

      function List(domNode) {
        _classCallCheck(this, List);

        var _this2 = _possibleConstructorReturn(this, (List.__proto__ || Object.getPrototypeOf(List)).call(this, domNode));

        var listEventHandler = function listEventHandler(e) {
          if (e.target.parentNode !== domNode) return;
          var format = _this2.statics.formats(domNode);
          var blot = _parchment2.default.find(e.target);
          if (format === 'checked') {
            blot.format('list', 'unchecked');
          } else if (format === 'unchecked') {
            blot.format('list', 'checked');
          }
        };

        domNode.addEventListener('touchstart', listEventHandler);
        domNode.addEventListener('mousedown', listEventHandler);
        return _this2;
      }

      _createClass(List, [{
        key: 'format',
        value: function format(name, value) {
          if (this.children.length > 0) {
            this.children.tail.format(name, value);
          }
        }
      }, {
        key: 'formats',
        value: function formats() {
          // We don't inherit from FormatBlot
          return _defineProperty({}, this.statics.blotName, this.statics.formats(this.domNode));
        }
      }, {
        key: 'insertBefore',
        value: function insertBefore(blot, ref) {
          if (blot instanceof ListItem) {
            _get(List.prototype.__proto__ || Object.getPrototypeOf(List.prototype), 'insertBefore', this).call(this, blot, ref);
          } else {
            var index = ref == null ? this.length() : ref.offset(this);
            var after = this.split(index);
            after.parent.insertBefore(blot, after);
          }
        }
      }, {
        key: 'optimize',
        value: function optimize(context) {
          _get(List.prototype.__proto__ || Object.getPrototypeOf(List.prototype), 'optimize', this).call(this, context);
          var next = this.next;
          if (next != null && next.prev === this && next.statics.blotName === this.statics.blotName && next.domNode.tagName === this.domNode.tagName && next.domNode.getAttribute('data-checked') === this.domNode.getAttribute('data-checked')) {
            next.moveChildren(this);
            next.remove();
          }
        }
      }, {
        key: 'replace',
        value: function replace(target) {
          if (target.statics.blotName !== this.statics.blotName) {
            var item = _parchment2.default.create(this.statics.defaultChild);
            target.moveChildren(item);
            this.appendChild(item);
          }
          _get(List.prototype.__proto__ || Object.getPrototypeOf(List.prototype), 'replace', this).call(this, target);
        }
      }]);

      return List;
    }(_container2.default);

    List.blotName = 'list';
    List.scope = _parchment2.default.Scope.BLOCK_BLOT;
    List.tagName = ['OL', 'UL'];
    List.defaultChild = 'list-item';
    List.allowedChildren = [ListItem];

    exports.ListItem = ListItem;
    exports.default = List;

    /***/ }),
    /* 68 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _bold = __webpack_require__(56);

    var _bold2 = _interopRequireDefault(_bold);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Italic = function (_Bold) {
      _inherits(Italic, _Bold);

      function Italic() {
        _classCallCheck(this, Italic);

        return _possibleConstructorReturn(this, (Italic.__proto__ || Object.getPrototypeOf(Italic)).apply(this, arguments));
      }

      return Italic;
    }(_bold2.default);

    Italic.blotName = 'italic';
    Italic.tagName = ['EM', 'I'];

    exports.default = Italic;

    /***/ }),
    /* 69 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Script = function (_Inline) {
      _inherits(Script, _Inline);

      function Script() {
        _classCallCheck(this, Script);

        return _possibleConstructorReturn(this, (Script.__proto__ || Object.getPrototypeOf(Script)).apply(this, arguments));
      }

      _createClass(Script, null, [{
        key: 'create',
        value: function create(value) {
          if (value === 'super') {
            return document.createElement('sup');
          } else if (value === 'sub') {
            return document.createElement('sub');
          } else {
            return _get(Script.__proto__ || Object.getPrototypeOf(Script), 'create', this).call(this, value);
          }
        }
      }, {
        key: 'formats',
        value: function formats(domNode) {
          if (domNode.tagName === 'SUB') return 'sub';
          if (domNode.tagName === 'SUP') return 'super';
          return undefined;
        }
      }]);

      return Script;
    }(_inline2.default);

    Script.blotName = 'script';
    Script.tagName = ['SUB', 'SUP'];

    exports.default = Script;

    /***/ }),
    /* 70 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Strike = function (_Inline) {
      _inherits(Strike, _Inline);

      function Strike() {
        _classCallCheck(this, Strike);

        return _possibleConstructorReturn(this, (Strike.__proto__ || Object.getPrototypeOf(Strike)).apply(this, arguments));
      }

      return Strike;
    }(_inline2.default);

    Strike.blotName = 'strike';
    Strike.tagName = 'S';

    exports.default = Strike;

    /***/ }),
    /* 71 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _inline = __webpack_require__(6);

    var _inline2 = _interopRequireDefault(_inline);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var Underline = function (_Inline) {
      _inherits(Underline, _Inline);

      function Underline() {
        _classCallCheck(this, Underline);

        return _possibleConstructorReturn(this, (Underline.__proto__ || Object.getPrototypeOf(Underline)).apply(this, arguments));
      }

      return Underline;
    }(_inline2.default);

    Underline.blotName = 'underline';
    Underline.tagName = 'U';

    exports.default = Underline;

    /***/ }),
    /* 72 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _link = __webpack_require__(27);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var ATTRIBUTES = ['alt', 'height', 'width'];

    var Image = function (_Parchment$Embed) {
      _inherits(Image, _Parchment$Embed);

      function Image() {
        _classCallCheck(this, Image);

        return _possibleConstructorReturn(this, (Image.__proto__ || Object.getPrototypeOf(Image)).apply(this, arguments));
      }

      _createClass(Image, [{
        key: 'format',
        value: function format(name, value) {
          if (ATTRIBUTES.indexOf(name) > -1) {
            if (value) {
              this.domNode.setAttribute(name, value);
            } else {
              this.domNode.removeAttribute(name);
            }
          } else {
            _get(Image.prototype.__proto__ || Object.getPrototypeOf(Image.prototype), 'format', this).call(this, name, value);
          }
        }
      }], [{
        key: 'create',
        value: function create(value) {
          var node = _get(Image.__proto__ || Object.getPrototypeOf(Image), 'create', this).call(this, value);
          if (typeof value === 'string') {
            node.setAttribute('src', this.sanitize(value));
          }
          return node;
        }
      }, {
        key: 'formats',
        value: function formats(domNode) {
          return ATTRIBUTES.reduce(function (formats, attribute) {
            if (domNode.hasAttribute(attribute)) {
              formats[attribute] = domNode.getAttribute(attribute);
            }
            return formats;
          }, {});
        }
      }, {
        key: 'match',
        value: function match(url) {
          return (/\.(jpe?g|gif|png)$/.test(url) || /^data:image\/.+;base64/.test(url)
          );
        }
      }, {
        key: 'sanitize',
        value: function sanitize(url) {
          return (0, _link.sanitize)(url, ['http', 'https', 'data']) ? url : '//:0';
        }
      }, {
        key: 'value',
        value: function value(domNode) {
          return domNode.getAttribute('src');
        }
      }]);

      return Image;
    }(_parchment2.default.Embed);

    Image.blotName = 'image';
    Image.tagName = 'IMG';

    exports.default = Image;

    /***/ }),
    /* 73 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _block = __webpack_require__(4);

    var _link = __webpack_require__(27);

    var _link2 = _interopRequireDefault(_link);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var ATTRIBUTES = ['height', 'width'];

    var Video = function (_BlockEmbed) {
      _inherits(Video, _BlockEmbed);

      function Video() {
        _classCallCheck(this, Video);

        return _possibleConstructorReturn(this, (Video.__proto__ || Object.getPrototypeOf(Video)).apply(this, arguments));
      }

      _createClass(Video, [{
        key: 'format',
        value: function format(name, value) {
          if (ATTRIBUTES.indexOf(name) > -1) {
            if (value) {
              this.domNode.setAttribute(name, value);
            } else {
              this.domNode.removeAttribute(name);
            }
          } else {
            _get(Video.prototype.__proto__ || Object.getPrototypeOf(Video.prototype), 'format', this).call(this, name, value);
          }
        }
      }], [{
        key: 'create',
        value: function create(value) {
          var node = _get(Video.__proto__ || Object.getPrototypeOf(Video), 'create', this).call(this, value);
          node.setAttribute('frameborder', '0');
          node.setAttribute('allowfullscreen', true);
          node.setAttribute('src', this.sanitize(value));
          return node;
        }
      }, {
        key: 'formats',
        value: function formats(domNode) {
          return ATTRIBUTES.reduce(function (formats, attribute) {
            if (domNode.hasAttribute(attribute)) {
              formats[attribute] = domNode.getAttribute(attribute);
            }
            return formats;
          }, {});
        }
      }, {
        key: 'sanitize',
        value: function sanitize(url) {
          return _link2.default.sanitize(url);
        }
      }, {
        key: 'value',
        value: function value(domNode) {
          return domNode.getAttribute('src');
        }
      }]);

      return Video;
    }(_block.BlockEmbed);

    Video.blotName = 'video';
    Video.className = 'ql-video';
    Video.tagName = 'IFRAME';

    exports.default = Video;

    /***/ }),
    /* 74 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.FormulaBlot = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _embed = __webpack_require__(35);

    var _embed2 = _interopRequireDefault(_embed);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var FormulaBlot = function (_Embed) {
      _inherits(FormulaBlot, _Embed);

      function FormulaBlot() {
        _classCallCheck(this, FormulaBlot);

        return _possibleConstructorReturn(this, (FormulaBlot.__proto__ || Object.getPrototypeOf(FormulaBlot)).apply(this, arguments));
      }

      _createClass(FormulaBlot, null, [{
        key: 'create',
        value: function create(value) {
          var node = _get(FormulaBlot.__proto__ || Object.getPrototypeOf(FormulaBlot), 'create', this).call(this, value);
          if (typeof value === 'string') {
            window.katex.render(value, node, {
              throwOnError: false,
              errorColor: '#f00'
            });
            node.setAttribute('data-value', value);
          }
          return node;
        }
      }, {
        key: 'value',
        value: function value(domNode) {
          return domNode.getAttribute('data-value');
        }
      }]);

      return FormulaBlot;
    }(_embed2.default);

    FormulaBlot.blotName = 'formula';
    FormulaBlot.className = 'ql-formula';
    FormulaBlot.tagName = 'SPAN';

    var Formula = function (_Module) {
      _inherits(Formula, _Module);

      _createClass(Formula, null, [{
        key: 'register',
        value: function register() {
          _quill2.default.register(FormulaBlot, true);
        }
      }]);

      function Formula() {
        _classCallCheck(this, Formula);

        var _this2 = _possibleConstructorReturn(this, (Formula.__proto__ || Object.getPrototypeOf(Formula)).call(this));

        if (window.katex == null) {
          throw new Error('Formula module requires KaTeX.');
        }
        return _this2;
      }

      return Formula;
    }(_module2.default);

    exports.FormulaBlot = FormulaBlot;
    exports.default = Formula;

    /***/ }),
    /* 75 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.CodeToken = exports.CodeBlock = undefined;

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _parchment = __webpack_require__(0);

    var _parchment2 = _interopRequireDefault(_parchment);

    var _quill = __webpack_require__(5);

    var _quill2 = _interopRequireDefault(_quill);

    var _module = __webpack_require__(9);

    var _module2 = _interopRequireDefault(_module);

    var _code = __webpack_require__(13);

    var _code2 = _interopRequireDefault(_code);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var SyntaxCodeBlock = function (_CodeBlock) {
      _inherits(SyntaxCodeBlock, _CodeBlock);

      function SyntaxCodeBlock() {
        _classCallCheck(this, SyntaxCodeBlock);

        return _possibleConstructorReturn(this, (SyntaxCodeBlock.__proto__ || Object.getPrototypeOf(SyntaxCodeBlock)).apply(this, arguments));
      }

      _createClass(SyntaxCodeBlock, [{
        key: 'replaceWith',
        value: function replaceWith(block) {
          this.domNode.textContent = this.domNode.textContent;
          this.attach();
          _get(SyntaxCodeBlock.prototype.__proto__ || Object.getPrototypeOf(SyntaxCodeBlock.prototype), 'replaceWith', this).call(this, block);
        }
      }, {
        key: 'highlight',
        value: function highlight(_highlight) {
          var text = this.domNode.textContent;
          if (this.cachedText !== text) {
            if (text.trim().length > 0 || this.cachedText == null) {
              this.domNode.innerHTML = _highlight(text);
              this.domNode.normalize();
              this.attach();
            }
            this.cachedText = text;
          }
        }
      }]);

      return SyntaxCodeBlock;
    }(_code2.default);

    SyntaxCodeBlock.className = 'ql-syntax';

    var CodeToken = new _parchment2.default.Attributor.Class('token', 'hljs', {
      scope: _parchment2.default.Scope.INLINE
    });

    var Syntax = function (_Module) {
      _inherits(Syntax, _Module);

      _createClass(Syntax, null, [{
        key: 'register',
        value: function register() {
          _quill2.default.register(CodeToken, true);
          _quill2.default.register(SyntaxCodeBlock, true);
        }
      }]);

      function Syntax(quill, options) {
        _classCallCheck(this, Syntax);

        var _this2 = _possibleConstructorReturn(this, (Syntax.__proto__ || Object.getPrototypeOf(Syntax)).call(this, quill, options));

        if (typeof _this2.options.highlight !== 'function') {
          throw new Error('Syntax module requires highlight.js. Please include the library on the page before Quill.');
        }
        var timer = null;
        _this2.quill.on(_quill2.default.events.SCROLL_OPTIMIZE, function () {
          clearTimeout(timer);
          timer = setTimeout(function () {
            _this2.highlight();
            timer = null;
          }, _this2.options.interval);
        });
        _this2.highlight();
        return _this2;
      }

      _createClass(Syntax, [{
        key: 'highlight',
        value: function highlight() {
          var _this3 = this;

          if (this.quill.selection.composing) return;
          this.quill.update(_quill2.default.sources.USER);
          var range = this.quill.getSelection();
          this.quill.scroll.descendants(SyntaxCodeBlock).forEach(function (code) {
            code.highlight(_this3.options.highlight);
          });
          this.quill.update(_quill2.default.sources.SILENT);
          if (range != null) {
            this.quill.setSelection(range, _quill2.default.sources.SILENT);
          }
        }
      }]);

      return Syntax;
    }(_module2.default);

    Syntax.DEFAULTS = {
      highlight: function () {
        if (window.hljs == null) return null;
        return function (text) {
          var result = window.hljs.highlightAuto(text);
          return result.value;
        };
      }(),
      interval: 1000
    };

    exports.CodeBlock = SyntaxCodeBlock;
    exports.CodeToken = CodeToken;
    exports.default = Syntax;

    /***/ }),
    /* 76 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=3 x2=15 y1=9 y2=9></line> <line class=ql-stroke x1=3 x2=13 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=9 y1=4 y2=4></line> </svg>";

    /***/ }),
    /* 77 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=15 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=14 x2=4 y1=14 y2=14></line> <line class=ql-stroke x1=12 x2=6 y1=4 y2=4></line> </svg>";

    /***/ }),
    /* 78 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=15 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=15 x2=5 y1=14 y2=14></line> <line class=ql-stroke x1=15 x2=9 y1=4 y2=4></line> </svg>";

    /***/ }),
    /* 79 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=15 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=15 x2=3 y1=14 y2=14></line> <line class=ql-stroke x1=15 x2=3 y1=4 y2=4></line> </svg>";

    /***/ }),
    /* 80 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <g class=\"ql-fill ql-color-label\"> <polygon points=\"6 6.868 6 6 5 6 5 7 5.942 7 6 6.868\"></polygon> <rect height=1 width=1 x=4 y=4></rect> <polygon points=\"6.817 5 6 5 6 6 6.38 6 6.817 5\"></polygon> <rect height=1 width=1 x=2 y=6></rect> <rect height=1 width=1 x=3 y=5></rect> <rect height=1 width=1 x=4 y=7></rect> <polygon points=\"4 11.439 4 11 3 11 3 12 3.755 12 4 11.439\"></polygon> <rect height=1 width=1 x=2 y=12></rect> <rect height=1 width=1 x=2 y=9></rect> <rect height=1 width=1 x=2 y=15></rect> <polygon points=\"4.63 10 4 10 4 11 4.192 11 4.63 10\"></polygon> <rect height=1 width=1 x=3 y=8></rect> <path d=M10.832,4.2L11,4.582V4H10.708A1.948,1.948,0,0,1,10.832,4.2Z></path> <path d=M7,4.582L7.168,4.2A1.929,1.929,0,0,1,7.292,4H7V4.582Z></path> <path d=M8,13H7.683l-0.351.8a1.933,1.933,0,0,1-.124.2H8V13Z></path> <rect height=1 width=1 x=12 y=2></rect> <rect height=1 width=1 x=11 y=3></rect> <path d=M9,3H8V3.282A1.985,1.985,0,0,1,9,3Z></path> <rect height=1 width=1 x=2 y=3></rect> <rect height=1 width=1 x=6 y=2></rect> <rect height=1 width=1 x=3 y=2></rect> <rect height=1 width=1 x=5 y=3></rect> <rect height=1 width=1 x=9 y=2></rect> <rect height=1 width=1 x=15 y=14></rect> <polygon points=\"13.447 10.174 13.469 10.225 13.472 10.232 13.808 11 14 11 14 10 13.37 10 13.447 10.174\"></polygon> <rect height=1 width=1 x=13 y=7></rect> <rect height=1 width=1 x=15 y=5></rect> <rect height=1 width=1 x=14 y=6></rect> <rect height=1 width=1 x=15 y=8></rect> <rect height=1 width=1 x=14 y=9></rect> <path d=M3.775,14H3v1H4V14.314A1.97,1.97,0,0,1,3.775,14Z></path> <rect height=1 width=1 x=14 y=3></rect> <polygon points=\"12 6.868 12 6 11.62 6 12 6.868\"></polygon> <rect height=1 width=1 x=15 y=2></rect> <rect height=1 width=1 x=12 y=5></rect> <rect height=1 width=1 x=13 y=4></rect> <polygon points=\"12.933 9 13 9 13 8 12.495 8 12.933 9\"></polygon> <rect height=1 width=1 x=9 y=14></rect> <rect height=1 width=1 x=8 y=15></rect> <path d=M6,14.926V15H7V14.316A1.993,1.993,0,0,1,6,14.926Z></path> <rect height=1 width=1 x=5 y=15></rect> <path d=M10.668,13.8L10.317,13H10v1h0.792A1.947,1.947,0,0,1,10.668,13.8Z></path> <rect height=1 width=1 x=11 y=15></rect> <path d=M14.332,12.2a1.99,1.99,0,0,1,.166.8H15V12H14.245Z></path> <rect height=1 width=1 x=14 y=15></rect> <rect height=1 width=1 x=15 y=11></rect> </g> <polyline class=ql-stroke points=\"5.5 13 9 5 12.5 13\"></polyline> <line class=ql-stroke x1=11.63 x2=6.38 y1=11 y2=11></line> </svg>";

    /***/ }),
    /* 81 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=\"ql-fill ql-stroke\" height=3 width=3 x=4 y=5></rect> <rect class=\"ql-fill ql-stroke\" height=3 width=3 x=11 y=5></rect> <path class=\"ql-even ql-fill ql-stroke\" d=M7,8c0,4.031-3,5-3,5></path> <path class=\"ql-even ql-fill ql-stroke\" d=M14,8c0,4.031-3,5-3,5></path> </svg>";

    /***/ }),
    /* 82 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-stroke d=M5,4H9.5A2.5,2.5,0,0,1,12,6.5v0A2.5,2.5,0,0,1,9.5,9H5A0,0,0,0,1,5,9V4A0,0,0,0,1,5,4Z></path> <path class=ql-stroke d=M5,9h5.5A2.5,2.5,0,0,1,13,11.5v0A2.5,2.5,0,0,1,10.5,14H5a0,0,0,0,1,0,0V9A0,0,0,0,1,5,9Z></path> </svg>";

    /***/ }),
    /* 83 */
    /***/ (function(module, exports) {

    module.exports = "<svg class=\"\" viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=5 x2=13 y1=3 y2=3></line> <line class=ql-stroke x1=6 x2=9.35 y1=12 y2=3></line> <line class=ql-stroke x1=11 x2=15 y1=11 y2=15></line> <line class=ql-stroke x1=15 x2=11 y1=11 y2=15></line> <rect class=ql-fill height=1 rx=0.5 ry=0.5 width=7 x=2 y=14></rect> </svg>";

    /***/ }),
    /* 84 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=\"ql-color-label ql-stroke ql-transparent\" x1=3 x2=15 y1=15 y2=15></line> <polyline class=ql-stroke points=\"5.5 11 9 3 12.5 11\"></polyline> <line class=ql-stroke x1=11.63 x2=6.38 y1=9 y2=9></line> </svg>";

    /***/ }),
    /* 85 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <polygon class=\"ql-stroke ql-fill\" points=\"3 11 5 9 3 7 3 11\"></polygon> <line class=\"ql-stroke ql-fill\" x1=15 x2=11 y1=4 y2=4></line> <path class=ql-fill d=M11,3a3,3,0,0,0,0,6h1V3H11Z></path> <rect class=ql-fill height=11 width=1 x=11 y=4></rect> <rect class=ql-fill height=11 width=1 x=13 y=4></rect> </svg>";

    /***/ }),
    /* 86 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <polygon class=\"ql-stroke ql-fill\" points=\"15 12 13 10 15 8 15 12\"></polygon> <line class=\"ql-stroke ql-fill\" x1=9 x2=5 y1=4 y2=4></line> <path class=ql-fill d=M5,3A3,3,0,0,0,5,9H6V3H5Z></path> <rect class=ql-fill height=11 width=1 x=5 y=4></rect> <rect class=ql-fill height=11 width=1 x=7 y=4></rect> </svg>";

    /***/ }),
    /* 87 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M14,16H4a1,1,0,0,1,0-2H14A1,1,0,0,1,14,16Z /> <path class=ql-fill d=M14,4H4A1,1,0,0,1,4,2H14A1,1,0,0,1,14,4Z /> <rect class=ql-fill x=3 y=6 width=12 height=6 rx=1 ry=1 /> </svg>";

    /***/ }),
    /* 88 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M13,16H5a1,1,0,0,1,0-2h8A1,1,0,0,1,13,16Z /> <path class=ql-fill d=M13,4H5A1,1,0,0,1,5,2h8A1,1,0,0,1,13,4Z /> <rect class=ql-fill x=2 y=6 width=14 height=6 rx=1 ry=1 /> </svg>";

    /***/ }),
    /* 89 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M15,8H13a1,1,0,0,1,0-2h2A1,1,0,0,1,15,8Z /> <path class=ql-fill d=M15,12H13a1,1,0,0,1,0-2h2A1,1,0,0,1,15,12Z /> <path class=ql-fill d=M15,16H5a1,1,0,0,1,0-2H15A1,1,0,0,1,15,16Z /> <path class=ql-fill d=M15,4H5A1,1,0,0,1,5,2H15A1,1,0,0,1,15,4Z /> <rect class=ql-fill x=2 y=6 width=8 height=6 rx=1 ry=1 /> </svg>";

    /***/ }),
    /* 90 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M5,8H3A1,1,0,0,1,3,6H5A1,1,0,0,1,5,8Z /> <path class=ql-fill d=M5,12H3a1,1,0,0,1,0-2H5A1,1,0,0,1,5,12Z /> <path class=ql-fill d=M13,16H3a1,1,0,0,1,0-2H13A1,1,0,0,1,13,16Z /> <path class=ql-fill d=M13,4H3A1,1,0,0,1,3,2H13A1,1,0,0,1,13,4Z /> <rect class=ql-fill x=8 y=6 width=8 height=6 rx=1 ry=1 transform=\"translate(24 18) rotate(-180)\"/> </svg>";

    /***/ }),
    /* 91 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M11.759,2.482a2.561,2.561,0,0,0-3.53.607A7.656,7.656,0,0,0,6.8,6.2C6.109,9.188,5.275,14.677,4.15,14.927a1.545,1.545,0,0,0-1.3-.933A0.922,0.922,0,0,0,2,15.036S1.954,16,4.119,16s3.091-2.691,3.7-5.553c0.177-.826.36-1.726,0.554-2.6L8.775,6.2c0.381-1.421.807-2.521,1.306-2.676a1.014,1.014,0,0,0,1.02.56A0.966,0.966,0,0,0,11.759,2.482Z></path> <rect class=ql-fill height=1.6 rx=0.8 ry=0.8 width=5 x=5.15 y=6.2></rect> <path class=ql-fill d=M13.663,12.027a1.662,1.662,0,0,1,.266-0.276q0.193,0.069.456,0.138a2.1,2.1,0,0,0,.535.069,1.075,1.075,0,0,0,.767-0.3,1.044,1.044,0,0,0,.314-0.8,0.84,0.84,0,0,0-.238-0.619,0.8,0.8,0,0,0-.594-0.239,1.154,1.154,0,0,0-.781.3,4.607,4.607,0,0,0-.781,1q-0.091.15-.218,0.346l-0.246.38c-0.068-.288-0.137-0.582-0.212-0.885-0.459-1.847-2.494-.984-2.941-0.8-0.482.2-.353,0.647-0.094,0.529a0.869,0.869,0,0,1,1.281.585c0.217,0.751.377,1.436,0.527,2.038a5.688,5.688,0,0,1-.362.467,2.69,2.69,0,0,1-.264.271q-0.221-.08-0.471-0.147a2.029,2.029,0,0,0-.522-0.066,1.079,1.079,0,0,0-.768.3A1.058,1.058,0,0,0,9,15.131a0.82,0.82,0,0,0,.832.852,1.134,1.134,0,0,0,.787-0.3,5.11,5.11,0,0,0,.776-0.993q0.141-.219.215-0.34c0.046-.076.122-0.194,0.223-0.346a2.786,2.786,0,0,0,.918,1.726,2.582,2.582,0,0,0,2.376-.185c0.317-.181.212-0.565,0-0.494A0.807,0.807,0,0,1,14.176,15a5.159,5.159,0,0,1-.913-2.446l0,0Q13.487,12.24,13.663,12.027Z></path> </svg>";

    /***/ }),
    /* 92 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewBox=\"0 0 18 18\"> <path class=ql-fill d=M10,4V14a1,1,0,0,1-2,0V10H3v4a1,1,0,0,1-2,0V4A1,1,0,0,1,3,4V8H8V4a1,1,0,0,1,2,0Zm6.06787,9.209H14.98975V7.59863a.54085.54085,0,0,0-.605-.60547h-.62744a1.01119,1.01119,0,0,0-.748.29688L11.645,8.56641a.5435.5435,0,0,0-.022.8584l.28613.30762a.53861.53861,0,0,0,.84717.0332l.09912-.08789a1.2137,1.2137,0,0,0,.2417-.35254h.02246s-.01123.30859-.01123.60547V13.209H12.041a.54085.54085,0,0,0-.605.60547v.43945a.54085.54085,0,0,0,.605.60547h4.02686a.54085.54085,0,0,0,.605-.60547v-.43945A.54085.54085,0,0,0,16.06787,13.209Z /> </svg>";

    /***/ }),
    /* 93 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewBox=\"0 0 18 18\"> <path class=ql-fill d=M16.73975,13.81445v.43945a.54085.54085,0,0,1-.605.60547H11.855a.58392.58392,0,0,1-.64893-.60547V14.0127c0-2.90527,3.39941-3.42187,3.39941-4.55469a.77675.77675,0,0,0-.84717-.78125,1.17684,1.17684,0,0,0-.83594.38477c-.2749.26367-.561.374-.85791.13184l-.4292-.34082c-.30811-.24219-.38525-.51758-.1543-.81445a2.97155,2.97155,0,0,1,2.45361-1.17676,2.45393,2.45393,0,0,1,2.68408,2.40918c0,2.45312-3.1792,2.92676-3.27832,3.93848h2.79443A.54085.54085,0,0,1,16.73975,13.81445ZM9,3A.99974.99974,0,0,0,8,4V8H3V4A1,1,0,0,0,1,4V14a1,1,0,0,0,2,0V10H8v4a1,1,0,0,0,2,0V4A.99974.99974,0,0,0,9,3Z /> </svg>";

    /***/ }),
    /* 94 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=7 x2=13 y1=4 y2=4></line> <line class=ql-stroke x1=5 x2=11 y1=14 y2=14></line> <line class=ql-stroke x1=8 x2=10 y1=14 y2=4></line> </svg>";

    /***/ }),
    /* 95 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=ql-stroke height=10 width=12 x=3 y=4></rect> <circle class=ql-fill cx=6 cy=7 r=1></circle> <polyline class=\"ql-even ql-fill\" points=\"5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12\"></polyline> </svg>";

    /***/ }),
    /* 96 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=3 x2=15 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=9 x2=15 y1=9 y2=9></line> <polyline class=\"ql-fill ql-stroke\" points=\"3 7 3 11 5 9 3 7\"></polyline> </svg>";

    /***/ }),
    /* 97 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=3 x2=15 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=9 x2=15 y1=9 y2=9></line> <polyline class=ql-stroke points=\"5 7 5 11 3 9 5 7\"></polyline> </svg>";

    /***/ }),
    /* 98 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=7 x2=11 y1=7 y2=11></line> <path class=\"ql-even ql-stroke\" d=M8.9,4.577a3.476,3.476,0,0,1,.36,4.679A3.476,3.476,0,0,1,4.577,8.9C3.185,7.5,2.035,6.4,4.217,4.217S7.5,3.185,8.9,4.577Z></path> <path class=\"ql-even ql-stroke\" d=M13.423,9.1a3.476,3.476,0,0,0-4.679-.36,3.476,3.476,0,0,0,.36,4.679c1.392,1.392,2.5,2.542,4.679.36S14.815,10.5,13.423,9.1Z></path> </svg>";

    /***/ }),
    /* 99 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=7 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=7 x2=15 y1=9 y2=9></line> <line class=ql-stroke x1=7 x2=15 y1=14 y2=14></line> <line class=\"ql-stroke ql-thin\" x1=2.5 x2=4.5 y1=5.5 y2=5.5></line> <path class=ql-fill d=M3.5,6A0.5,0.5,0,0,1,3,5.5V3.085l-0.276.138A0.5,0.5,0,0,1,2.053,3c-0.124-.247-0.023-0.324.224-0.447l1-.5A0.5,0.5,0,0,1,4,2.5v3A0.5,0.5,0,0,1,3.5,6Z></path> <path class=\"ql-stroke ql-thin\" d=M4.5,10.5h-2c0-.234,1.85-1.076,1.85-2.234A0.959,0.959,0,0,0,2.5,8.156></path> <path class=\"ql-stroke ql-thin\" d=M2.5,14.846a0.959,0.959,0,0,0,1.85-.109A0.7,0.7,0,0,0,3.75,14a0.688,0.688,0,0,0,.6-0.736,0.959,0.959,0,0,0-1.85-.109></path> </svg>";

    /***/ }),
    /* 100 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=6 x2=15 y1=4 y2=4></line> <line class=ql-stroke x1=6 x2=15 y1=9 y2=9></line> <line class=ql-stroke x1=6 x2=15 y1=14 y2=14></line> <line class=ql-stroke x1=3 x2=3 y1=4 y2=4></line> <line class=ql-stroke x1=3 x2=3 y1=9 y2=9></line> <line class=ql-stroke x1=3 x2=3 y1=14 y2=14></line> </svg>";

    /***/ }),
    /* 101 */
    /***/ (function(module, exports) {

    module.exports = "<svg class=\"\" viewbox=\"0 0 18 18\"> <line class=ql-stroke x1=9 x2=15 y1=4 y2=4></line> <polyline class=ql-stroke points=\"3 4 4 5 6 3\"></polyline> <line class=ql-stroke x1=9 x2=15 y1=14 y2=14></line> <polyline class=ql-stroke points=\"3 14 4 15 6 13\"></polyline> <line class=ql-stroke x1=9 x2=15 y1=9 y2=9></line> <polyline class=ql-stroke points=\"3 9 4 10 6 8\"></polyline> </svg>";

    /***/ }),
    /* 102 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M15.5,15H13.861a3.858,3.858,0,0,0,1.914-2.975,1.8,1.8,0,0,0-1.6-1.751A1.921,1.921,0,0,0,12.021,11.7a0.50013,0.50013,0,1,0,.957.291h0a0.914,0.914,0,0,1,1.053-.725,0.81,0.81,0,0,1,.744.762c0,1.076-1.16971,1.86982-1.93971,2.43082A1.45639,1.45639,0,0,0,12,15.5a0.5,0.5,0,0,0,.5.5h3A0.5,0.5,0,0,0,15.5,15Z /> <path class=ql-fill d=M9.65,5.241a1,1,0,0,0-1.409.108L6,7.964,3.759,5.349A1,1,0,0,0,2.192,6.59178Q2.21541,6.6213,2.241,6.649L4.684,9.5,2.241,12.35A1,1,0,0,0,3.71,13.70722q0.02557-.02768.049-0.05722L6,11.036,8.241,13.65a1,1,0,1,0,1.567-1.24277Q9.78459,12.3777,9.759,12.35L7.316,9.5,9.759,6.651A1,1,0,0,0,9.65,5.241Z /> </svg>";

    /***/ }),
    /* 103 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-fill d=M15.5,7H13.861a4.015,4.015,0,0,0,1.914-2.975,1.8,1.8,0,0,0-1.6-1.751A1.922,1.922,0,0,0,12.021,3.7a0.5,0.5,0,1,0,.957.291,0.917,0.917,0,0,1,1.053-.725,0.81,0.81,0,0,1,.744.762c0,1.077-1.164,1.925-1.934,2.486A1.423,1.423,0,0,0,12,7.5a0.5,0.5,0,0,0,.5.5h3A0.5,0.5,0,0,0,15.5,7Z /> <path class=ql-fill d=M9.651,5.241a1,1,0,0,0-1.41.108L6,7.964,3.759,5.349a1,1,0,1,0-1.519,1.3L4.683,9.5,2.241,12.35a1,1,0,1,0,1.519,1.3L6,11.036,8.241,13.65a1,1,0,0,0,1.519-1.3L7.317,9.5,9.759,6.651A1,1,0,0,0,9.651,5.241Z /> </svg>";

    /***/ }),
    /* 104 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <line class=\"ql-stroke ql-thin\" x1=15.5 x2=2.5 y1=8.5 y2=9.5></line> <path class=ql-fill d=M9.007,8C6.542,7.791,6,7.519,6,6.5,6,5.792,7.283,5,9,5c1.571,0,2.765.679,2.969,1.309a1,1,0,0,0,1.9-.617C13.356,4.106,11.354,3,9,3,6.2,3,4,4.538,4,6.5a3.2,3.2,0,0,0,.5,1.843Z></path> <path class=ql-fill d=M8.984,10C11.457,10.208,12,10.479,12,11.5c0,0.708-1.283,1.5-3,1.5-1.571,0-2.765-.679-2.969-1.309a1,1,0,1,0-1.9.617C4.644,13.894,6.646,15,9,15c2.8,0,5-1.538,5-3.5a3.2,3.2,0,0,0-.5-1.843Z></path> </svg>";

    /***/ }),
    /* 105 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <path class=ql-stroke d=M5,3V9a4.012,4.012,0,0,0,4,4H9a4.012,4.012,0,0,0,4-4V3></path> <rect class=ql-fill height=1 rx=0.5 ry=0.5 width=12 x=3 y=15></rect> </svg>";

    /***/ }),
    /* 106 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <rect class=ql-stroke height=12 width=12 x=3 y=3></rect> <rect class=ql-fill height=12 width=1 x=5 y=3></rect> <rect class=ql-fill height=12 width=1 x=12 y=3></rect> <rect class=ql-fill height=2 width=8 x=5 y=8></rect> <rect class=ql-fill height=1 width=3 x=3 y=5></rect> <rect class=ql-fill height=1 width=3 x=3 y=7></rect> <rect class=ql-fill height=1 width=3 x=3 y=10></rect> <rect class=ql-fill height=1 width=3 x=3 y=12></rect> <rect class=ql-fill height=1 width=3 x=12 y=5></rect> <rect class=ql-fill height=1 width=3 x=12 y=7></rect> <rect class=ql-fill height=1 width=3 x=12 y=10></rect> <rect class=ql-fill height=1 width=3 x=12 y=12></rect> </svg>";

    /***/ }),
    /* 107 */
    /***/ (function(module, exports) {

    module.exports = "<svg viewbox=\"0 0 18 18\"> <polygon class=ql-stroke points=\"7 11 9 13 11 11 7 11\"></polygon> <polygon class=ql-stroke points=\"7 7 9 5 11 7 7 7\"></polygon> </svg>";

    /***/ }),
    /* 108 */
    /***/ (function(module, exports, __webpack_require__) {


    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = exports.BubbleTooltip = undefined;

    var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

    var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

    var _extend = __webpack_require__(3);

    var _extend2 = _interopRequireDefault(_extend);

    var _emitter = __webpack_require__(8);

    var _emitter2 = _interopRequireDefault(_emitter);

    var _base = __webpack_require__(43);

    var _base2 = _interopRequireDefault(_base);

    var _selection = __webpack_require__(15);

    var _icons = __webpack_require__(41);

    var _icons2 = _interopRequireDefault(_icons);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

    var TOOLBAR_CONFIG = [['bold', 'italic', 'link'], [{ header: 1 }, { header: 2 }, 'blockquote']];

    var BubbleTheme = function (_BaseTheme) {
      _inherits(BubbleTheme, _BaseTheme);

      function BubbleTheme(quill, options) {
        _classCallCheck(this, BubbleTheme);

        if (options.modules.toolbar != null && options.modules.toolbar.container == null) {
          options.modules.toolbar.container = TOOLBAR_CONFIG;
        }

        var _this = _possibleConstructorReturn(this, (BubbleTheme.__proto__ || Object.getPrototypeOf(BubbleTheme)).call(this, quill, options));

        _this.quill.container.classList.add('ql-bubble');
        return _this;
      }

      _createClass(BubbleTheme, [{
        key: 'extendToolbar',
        value: function extendToolbar(toolbar) {
          this.tooltip = new BubbleTooltip(this.quill, this.options.bounds);
          this.tooltip.root.appendChild(toolbar.container);
          this.buildButtons([].slice.call(toolbar.container.querySelectorAll('button')), _icons2.default);
          this.buildPickers([].slice.call(toolbar.container.querySelectorAll('select')), _icons2.default);
        }
      }]);

      return BubbleTheme;
    }(_base2.default);

    BubbleTheme.DEFAULTS = (0, _extend2.default)(true, {}, _base2.default.DEFAULTS, {
      modules: {
        toolbar: {
          handlers: {
            link: function link(value) {
              if (!value) {
                this.quill.format('link', false);
              } else {
                this.quill.theme.tooltip.edit();
              }
            }
          }
        }
      }
    });

    var BubbleTooltip = function (_BaseTooltip) {
      _inherits(BubbleTooltip, _BaseTooltip);

      function BubbleTooltip(quill, bounds) {
        _classCallCheck(this, BubbleTooltip);

        var _this2 = _possibleConstructorReturn(this, (BubbleTooltip.__proto__ || Object.getPrototypeOf(BubbleTooltip)).call(this, quill, bounds));

        _this2.quill.on(_emitter2.default.events.EDITOR_CHANGE, function (type, range, oldRange, source) {
          if (type !== _emitter2.default.events.SELECTION_CHANGE) return;
          if (range != null && range.length > 0 && source === _emitter2.default.sources.USER) {
            _this2.show();
            // Lock our width so we will expand beyond our offsetParent boundaries
            _this2.root.style.left = '0px';
            _this2.root.style.width = '';
            _this2.root.style.width = _this2.root.offsetWidth + 'px';
            var lines = _this2.quill.getLines(range.index, range.length);
            if (lines.length === 1) {
              _this2.position(_this2.quill.getBounds(range));
            } else {
              var lastLine = lines[lines.length - 1];
              var index = _this2.quill.getIndex(lastLine);
              var length = Math.min(lastLine.length() - 1, range.index + range.length - index);
              var _bounds = _this2.quill.getBounds(new _selection.Range(index, length));
              _this2.position(_bounds);
            }
          } else if (document.activeElement !== _this2.textbox && _this2.quill.hasFocus()) {
            _this2.hide();
          }
        });
        return _this2;
      }

      _createClass(BubbleTooltip, [{
        key: 'listen',
        value: function listen() {
          var _this3 = this;

          _get(BubbleTooltip.prototype.__proto__ || Object.getPrototypeOf(BubbleTooltip.prototype), 'listen', this).call(this);
          this.root.querySelector('.ql-close').addEventListener('click', function () {
            _this3.root.classList.remove('ql-editing');
          });
          this.quill.on(_emitter2.default.events.SCROLL_OPTIMIZE, function () {
            // Let selection be restored by toolbar handlers before repositioning
            setTimeout(function () {
              if (_this3.root.classList.contains('ql-hidden')) return;
              var range = _this3.quill.getSelection();
              if (range != null) {
                _this3.position(_this3.quill.getBounds(range));
              }
            }, 1);
          });
        }
      }, {
        key: 'cancel',
        value: function cancel() {
          this.show();
        }
      }, {
        key: 'position',
        value: function position(reference) {
          var shift = _get(BubbleTooltip.prototype.__proto__ || Object.getPrototypeOf(BubbleTooltip.prototype), 'position', this).call(this, reference);
          var arrow = this.root.querySelector('.ql-tooltip-arrow');
          arrow.style.marginLeft = '';
          if (shift === 0) return shift;
          arrow.style.marginLeft = -1 * shift - arrow.offsetWidth / 2 + 'px';
        }
      }]);

      return BubbleTooltip;
    }(_base.BaseTooltip);

    BubbleTooltip.TEMPLATE = ['<span class="ql-tooltip-arrow"></span>', '<div class="ql-tooltip-editor">', '<input type="text" data-formula="e=mc^2" data-link="https://quilljs.com" data-video="Embed URL">', '<a class="ql-close"></a>', '</div>'].join('');

    exports.BubbleTooltip = BubbleTooltip;
    exports.default = BubbleTheme;

    /***/ }),
    /* 109 */
    /***/ (function(module, exports, __webpack_require__) {

    module.exports = __webpack_require__(63);


    /***/ })
    /******/ ])["default"];
    });
    });

    var Quill = unwrapExports(quill$1);

    var sparkMd5 = createCommonjsModule(function (module, exports) {
    (function (factory) {
        {
            // Node/CommonJS
            module.exports = factory();
        }
    }(function (undefined$1) {

        /*
         * Fastest md5 implementation around (JKM md5).
         * Credits: Joseph Myers
         *
         * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
         * @see http://jsperf.com/md5-shootout/7
         */

        /* this function is much faster,
          so if possible we use it. Some IEs
          are the only ones I know of that
          need the idiotic second function,
          generated by an if clause.  */
        var hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

        function md5cycle(x, k) {
            var a = x[0],
                b = x[1],
                c = x[2],
                d = x[3];

            a += (b & c | ~b & d) + k[0] - 680876936 | 0;
            a  = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[1] - 389564586 | 0;
            d  = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[2] + 606105819 | 0;
            c  = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[3] - 1044525330 | 0;
            b  = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[4] - 176418897 | 0;
            a  = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[5] + 1200080426 | 0;
            d  = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[6] - 1473231341 | 0;
            c  = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[7] - 45705983 | 0;
            b  = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[8] + 1770035416 | 0;
            a  = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[9] - 1958414417 | 0;
            d  = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[10] - 42063 | 0;
            c  = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[11] - 1990404162 | 0;
            b  = (b << 22 | b >>> 10) + c | 0;
            a += (b & c | ~b & d) + k[12] + 1804603682 | 0;
            a  = (a << 7 | a >>> 25) + b | 0;
            d += (a & b | ~a & c) + k[13] - 40341101 | 0;
            d  = (d << 12 | d >>> 20) + a | 0;
            c += (d & a | ~d & b) + k[14] - 1502002290 | 0;
            c  = (c << 17 | c >>> 15) + d | 0;
            b += (c & d | ~c & a) + k[15] + 1236535329 | 0;
            b  = (b << 22 | b >>> 10) + c | 0;

            a += (b & d | c & ~d) + k[1] - 165796510 | 0;
            a  = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[6] - 1069501632 | 0;
            d  = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[11] + 643717713 | 0;
            c  = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[0] - 373897302 | 0;
            b  = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[5] - 701558691 | 0;
            a  = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[10] + 38016083 | 0;
            d  = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[15] - 660478335 | 0;
            c  = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[4] - 405537848 | 0;
            b  = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[9] + 568446438 | 0;
            a  = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[14] - 1019803690 | 0;
            d  = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[3] - 187363961 | 0;
            c  = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[8] + 1163531501 | 0;
            b  = (b << 20 | b >>> 12) + c | 0;
            a += (b & d | c & ~d) + k[13] - 1444681467 | 0;
            a  = (a << 5 | a >>> 27) + b | 0;
            d += (a & c | b & ~c) + k[2] - 51403784 | 0;
            d  = (d << 9 | d >>> 23) + a | 0;
            c += (d & b | a & ~b) + k[7] + 1735328473 | 0;
            c  = (c << 14 | c >>> 18) + d | 0;
            b += (c & a | d & ~a) + k[12] - 1926607734 | 0;
            b  = (b << 20 | b >>> 12) + c | 0;

            a += (b ^ c ^ d) + k[5] - 378558 | 0;
            a  = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[8] - 2022574463 | 0;
            d  = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[11] + 1839030562 | 0;
            c  = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[14] - 35309556 | 0;
            b  = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[1] - 1530992060 | 0;
            a  = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[4] + 1272893353 | 0;
            d  = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[7] - 155497632 | 0;
            c  = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[10] - 1094730640 | 0;
            b  = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[13] + 681279174 | 0;
            a  = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[0] - 358537222 | 0;
            d  = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[3] - 722521979 | 0;
            c  = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[6] + 76029189 | 0;
            b  = (b << 23 | b >>> 9) + c | 0;
            a += (b ^ c ^ d) + k[9] - 640364487 | 0;
            a  = (a << 4 | a >>> 28) + b | 0;
            d += (a ^ b ^ c) + k[12] - 421815835 | 0;
            d  = (d << 11 | d >>> 21) + a | 0;
            c += (d ^ a ^ b) + k[15] + 530742520 | 0;
            c  = (c << 16 | c >>> 16) + d | 0;
            b += (c ^ d ^ a) + k[2] - 995338651 | 0;
            b  = (b << 23 | b >>> 9) + c | 0;

            a += (c ^ (b | ~d)) + k[0] - 198630844 | 0;
            a  = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[7] + 1126891415 | 0;
            d  = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[14] - 1416354905 | 0;
            c  = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[5] - 57434055 | 0;
            b  = (b << 21 |b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[12] + 1700485571 | 0;
            a  = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[3] - 1894986606 | 0;
            d  = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[10] - 1051523 | 0;
            c  = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[1] - 2054922799 | 0;
            b  = (b << 21 |b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[8] + 1873313359 | 0;
            a  = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[15] - 30611744 | 0;
            d  = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[6] - 1560198380 | 0;
            c  = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[13] + 1309151649 | 0;
            b  = (b << 21 |b >>> 11) + c | 0;
            a += (c ^ (b | ~d)) + k[4] - 145523070 | 0;
            a  = (a << 6 | a >>> 26) + b | 0;
            d += (b ^ (a | ~c)) + k[11] - 1120210379 | 0;
            d  = (d << 10 | d >>> 22) + a | 0;
            c += (a ^ (d | ~b)) + k[2] + 718787259 | 0;
            c  = (c << 15 | c >>> 17) + d | 0;
            b += (d ^ (c | ~a)) + k[9] - 343485551 | 0;
            b  = (b << 21 | b >>> 11) + c | 0;

            x[0] = a + x[0] | 0;
            x[1] = b + x[1] | 0;
            x[2] = c + x[2] | 0;
            x[3] = d + x[3] | 0;
        }

        function md5blk(s) {
            var md5blks = [],
                i; /* Andy King said do it this way. */

            for (i = 0; i < 64; i += 4) {
                md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
            }
            return md5blks;
        }

        function md5blk_array(a) {
            var md5blks = [],
                i; /* Andy King said do it this way. */

            for (i = 0; i < 64; i += 4) {
                md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
            }
            return md5blks;
        }

        function md51(s) {
            var n = s.length,
                state = [1732584193, -271733879, -1732584194, 271733878],
                i,
                length,
                tail,
                tmp,
                lo,
                hi;

            for (i = 64; i <= n; i += 64) {
                md5cycle(state, md5blk(s.substring(i - 64, i)));
            }
            s = s.substring(i - 64);
            length = s.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i += 1) {
                tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
            }
            tail[i >> 2] |= 0x80 << ((i % 4) << 3);
            if (i > 55) {
                md5cycle(state, tail);
                for (i = 0; i < 16; i += 1) {
                    tail[i] = 0;
                }
            }

            // Beware that the final length might not fit in 32 bits so we take care of that
            tmp = n * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;

            tail[14] = lo;
            tail[15] = hi;

            md5cycle(state, tail);
            return state;
        }

        function md51_array(a) {
            var n = a.length,
                state = [1732584193, -271733879, -1732584194, 271733878],
                i,
                length,
                tail,
                tmp,
                lo,
                hi;

            for (i = 64; i <= n; i += 64) {
                md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
            }

            // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
            // containing the last element of the parent array if the sub array specified starts
            // beyond the length of the parent array - weird.
            // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
            a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

            length = a.length;
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (i = 0; i < length; i += 1) {
                tail[i >> 2] |= a[i] << ((i % 4) << 3);
            }

            tail[i >> 2] |= 0x80 << ((i % 4) << 3);
            if (i > 55) {
                md5cycle(state, tail);
                for (i = 0; i < 16; i += 1) {
                    tail[i] = 0;
                }
            }

            // Beware that the final length might not fit in 32 bits so we take care of that
            tmp = n * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;

            tail[14] = lo;
            tail[15] = hi;

            md5cycle(state, tail);

            return state;
        }

        function rhex(n) {
            var s = '',
                j;
            for (j = 0; j < 4; j += 1) {
                s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
            }
            return s;
        }

        function hex(x) {
            var i;
            for (i = 0; i < x.length; i += 1) {
                x[i] = rhex(x[i]);
            }
            return x.join('');
        }

        // In some cases the fast add32 function cannot be used..
        if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') ;

        // ---------------------------------------------------

        /**
         * ArrayBuffer slice polyfill.
         *
         * @see https://github.com/ttaubert/node-arraybuffer-slice
         */

        if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
            (function () {
                function clamp(val, length) {
                    val = (val | 0) || 0;

                    if (val < 0) {
                        return Math.max(val + length, 0);
                    }

                    return Math.min(val, length);
                }

                ArrayBuffer.prototype.slice = function (from, to) {
                    var length = this.byteLength,
                        begin = clamp(from, length),
                        end = length,
                        num,
                        target,
                        targetArray,
                        sourceArray;

                    if (to !== undefined$1) {
                        end = clamp(to, length);
                    }

                    if (begin > end) {
                        return new ArrayBuffer(0);
                    }

                    num = end - begin;
                    target = new ArrayBuffer(num);
                    targetArray = new Uint8Array(target);

                    sourceArray = new Uint8Array(this, begin, num);
                    targetArray.set(sourceArray);

                    return target;
                };
            })();
        }

        // ---------------------------------------------------

        /**
         * Helpers.
         */

        function toUtf8(str) {
            if (/[\u0080-\uFFFF]/.test(str)) {
                str = unescape(encodeURIComponent(str));
            }

            return str;
        }

        function utf8Str2ArrayBuffer(str, returnUInt8Array) {
            var length = str.length,
               buff = new ArrayBuffer(length),
               arr = new Uint8Array(buff),
               i;

            for (i = 0; i < length; i += 1) {
                arr[i] = str.charCodeAt(i);
            }

            return returnUInt8Array ? arr : buff;
        }

        function arrayBuffer2Utf8Str(buff) {
            return String.fromCharCode.apply(null, new Uint8Array(buff));
        }

        function concatenateArrayBuffers(first, second, returnUInt8Array) {
            var result = new Uint8Array(first.byteLength + second.byteLength);

            result.set(new Uint8Array(first));
            result.set(new Uint8Array(second), first.byteLength);

            return returnUInt8Array ? result : result.buffer;
        }

        function hexToBinaryString(hex) {
            var bytes = [],
                length = hex.length,
                x;

            for (x = 0; x < length - 1; x += 2) {
                bytes.push(parseInt(hex.substr(x, 2), 16));
            }

            return String.fromCharCode.apply(String, bytes);
        }

        // ---------------------------------------------------

        /**
         * SparkMD5 OOP implementation.
         *
         * Use this class to perform an incremental md5, otherwise use the
         * static methods instead.
         */

        function SparkMD5() {
            // call reset to init the instance
            this.reset();
        }

        /**
         * Appends a string.
         * A conversion will be applied if an utf8 string is detected.
         *
         * @param {String} str The string to be appended
         *
         * @return {SparkMD5} The instance itself
         */
        SparkMD5.prototype.append = function (str) {
            // Converts the string to utf8 bytes if necessary
            // Then append as binary
            this.appendBinary(toUtf8(str));

            return this;
        };

        /**
         * Appends a binary string.
         *
         * @param {String} contents The binary string to be appended
         *
         * @return {SparkMD5} The instance itself
         */
        SparkMD5.prototype.appendBinary = function (contents) {
            this._buff += contents;
            this._length += contents.length;

            var length = this._buff.length,
                i;

            for (i = 64; i <= length; i += 64) {
                md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
            }

            this._buff = this._buff.substring(i - 64);

            return this;
        };

        /**
         * Finishes the incremental computation, reseting the internal state and
         * returning the result.
         *
         * @param {Boolean} raw True to get the raw string, false to get the hex string
         *
         * @return {String} The result
         */
        SparkMD5.prototype.end = function (raw) {
            var buff = this._buff,
                length = buff.length,
                i,
                tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                ret;

            for (i = 0; i < length; i += 1) {
                tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
            }

            this._finish(tail, length);
            ret = hex(this._hash);

            if (raw) {
                ret = hexToBinaryString(ret);
            }

            this.reset();

            return ret;
        };

        /**
         * Resets the internal state of the computation.
         *
         * @return {SparkMD5} The instance itself
         */
        SparkMD5.prototype.reset = function () {
            this._buff = '';
            this._length = 0;
            this._hash = [1732584193, -271733879, -1732584194, 271733878];

            return this;
        };

        /**
         * Gets the internal state of the computation.
         *
         * @return {Object} The state
         */
        SparkMD5.prototype.getState = function () {
            return {
                buff: this._buff,
                length: this._length,
                hash: this._hash.slice()
            };
        };

        /**
         * Gets the internal state of the computation.
         *
         * @param {Object} state The state
         *
         * @return {SparkMD5} The instance itself
         */
        SparkMD5.prototype.setState = function (state) {
            this._buff = state.buff;
            this._length = state.length;
            this._hash = state.hash;

            return this;
        };

        /**
         * Releases memory used by the incremental buffer and other additional
         * resources. If you plan to use the instance again, use reset instead.
         */
        SparkMD5.prototype.destroy = function () {
            delete this._hash;
            delete this._buff;
            delete this._length;
        };

        /**
         * Finish the final calculation based on the tail.
         *
         * @param {Array}  tail   The tail (will be modified)
         * @param {Number} length The length of the remaining buffer
         */
        SparkMD5.prototype._finish = function (tail, length) {
            var i = length,
                tmp,
                lo,
                hi;

            tail[i >> 2] |= 0x80 << ((i % 4) << 3);
            if (i > 55) {
                md5cycle(this._hash, tail);
                for (i = 0; i < 16; i += 1) {
                    tail[i] = 0;
                }
            }

            // Do the final computation based on the tail and length
            // Beware that the final length may not fit in 32 bits so we take care of that
            tmp = this._length * 8;
            tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
            lo = parseInt(tmp[2], 16);
            hi = parseInt(tmp[1], 16) || 0;

            tail[14] = lo;
            tail[15] = hi;
            md5cycle(this._hash, tail);
        };

        /**
         * Performs the md5 hash on a string.
         * A conversion will be applied if utf8 string is detected.
         *
         * @param {String}  str The string
         * @param {Boolean} [raw] True to get the raw string, false to get the hex string
         *
         * @return {String} The result
         */
        SparkMD5.hash = function (str, raw) {
            // Converts the string to utf8 bytes if necessary
            // Then compute it using the binary function
            return SparkMD5.hashBinary(toUtf8(str), raw);
        };

        /**
         * Performs the md5 hash on a binary string.
         *
         * @param {String}  content The binary string
         * @param {Boolean} [raw]     True to get the raw string, false to get the hex string
         *
         * @return {String} The result
         */
        SparkMD5.hashBinary = function (content, raw) {
            var hash = md51(content),
                ret = hex(hash);

            return raw ? hexToBinaryString(ret) : ret;
        };

        // ---------------------------------------------------

        /**
         * SparkMD5 OOP implementation for array buffers.
         *
         * Use this class to perform an incremental md5 ONLY for array buffers.
         */
        SparkMD5.ArrayBuffer = function () {
            // call reset to init the instance
            this.reset();
        };

        /**
         * Appends an array buffer.
         *
         * @param {ArrayBuffer} arr The array to be appended
         *
         * @return {SparkMD5.ArrayBuffer} The instance itself
         */
        SparkMD5.ArrayBuffer.prototype.append = function (arr) {
            var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
                length = buff.length,
                i;

            this._length += arr.byteLength;

            for (i = 64; i <= length; i += 64) {
                md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
            }

            this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

            return this;
        };

        /**
         * Finishes the incremental computation, reseting the internal state and
         * returning the result.
         *
         * @param {Boolean} raw True to get the raw string, false to get the hex string
         *
         * @return {String} The result
         */
        SparkMD5.ArrayBuffer.prototype.end = function (raw) {
            var buff = this._buff,
                length = buff.length,
                tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                i,
                ret;

            for (i = 0; i < length; i += 1) {
                tail[i >> 2] |= buff[i] << ((i % 4) << 3);
            }

            this._finish(tail, length);
            ret = hex(this._hash);

            if (raw) {
                ret = hexToBinaryString(ret);
            }

            this.reset();

            return ret;
        };

        /**
         * Resets the internal state of the computation.
         *
         * @return {SparkMD5.ArrayBuffer} The instance itself
         */
        SparkMD5.ArrayBuffer.prototype.reset = function () {
            this._buff = new Uint8Array(0);
            this._length = 0;
            this._hash = [1732584193, -271733879, -1732584194, 271733878];

            return this;
        };

        /**
         * Gets the internal state of the computation.
         *
         * @return {Object} The state
         */
        SparkMD5.ArrayBuffer.prototype.getState = function () {
            var state = SparkMD5.prototype.getState.call(this);

            // Convert buffer to a string
            state.buff = arrayBuffer2Utf8Str(state.buff);

            return state;
        };

        /**
         * Gets the internal state of the computation.
         *
         * @param {Object} state The state
         *
         * @return {SparkMD5.ArrayBuffer} The instance itself
         */
        SparkMD5.ArrayBuffer.prototype.setState = function (state) {
            // Convert string to buffer
            state.buff = utf8Str2ArrayBuffer(state.buff, true);

            return SparkMD5.prototype.setState.call(this, state);
        };

        SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

        SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

        /**
         * Performs the md5 hash on an array buffer.
         *
         * @param {ArrayBuffer} arr The array buffer
         * @param {Boolean}     [raw] True to get the raw string, false to get the hex one
         *
         * @return {String} The result
         */
        SparkMD5.ArrayBuffer.hash = function (arr, raw) {
            var hash = md51_array(new Uint8Array(arr)),
                ret = hex(hash);

            return raw ? hexToBinaryString(ret) : ret;
        };

        return SparkMD5;
    }));
    });

    /* eslint-disable */
    function utf8Encode(argString) {
        // http://kevin.vanzonneveld.net
        // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   improved by: sowberry
        // +    tweaked by: Jack
        // +   bugfixed by: Onno Marsman
        // +   improved by: Yves Sucaet
        // +   bugfixed by: Onno Marsman
        // +   bugfixed by: Ulrich
        // +   bugfixed by: Rafal Kukawski
        // +   improved by: kirilloid
        // +   bugfixed by: kirilloid
        // *     example 1: this.utf8Encode('Kevin van Zonneveld')
        // *     returns 1: 'Kevin van Zonneveld'
        if (argString === null || typeof argString === 'undefined') {
            return '';
        }
        var string = argString + ''; // .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
        var utftext = '', start, end, stringl = 0;
        start = end = 0;
        stringl = string.length;
        for (var n = 0; n < stringl; n++) {
            var c1 = string.charCodeAt(n);
            var enc = null;
            if (c1 < 128) {
                end++;
            }
            else if (c1 > 127 && c1 < 2048) {
                enc = String.fromCharCode((c1 >> 6) | 192, (c1 & 63) | 128);
            }
            else if ((c1 & 0xf800 ^ 0xd800) > 0) {
                enc = String.fromCharCode((c1 >> 12) | 224, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
            }
            else {
                // surrogate pairs
                if ((c1 & 0xfc00 ^ 0xd800) > 0) {
                    throw new RangeError('Unmatched trail surrogate at ' + n);
                }
                var c2 = string.charCodeAt(++n);
                if ((c2 & 0xfc00 ^ 0xdc00) > 0) {
                    throw new RangeError('Unmatched lead surrogate at ' + (n - 1));
                }
                c1 = ((c1 & 0x3ff) << 10) + (c2 & 0x3ff) + 0x10000;
                enc = String.fromCharCode((c1 >> 18) | 240, ((c1 >> 12) & 63) | 128, ((c1 >> 6) & 63) | 128, (c1 & 63) | 128);
            }
            if (enc !== null) {
                if (end > start) {
                    utftext += string.slice(start, end);
                }
                utftext += enc;
                start = end = n + 1;
            }
        }
        if (end > start) {
            utftext += string.slice(start, stringl);
        }
        return utftext;
    }
    function base64Encode(data) {
        // http://kevin.vanzonneveld.net
        // +   original by: Tyler Akins (http://rumkin.com)
        // +   improved by: Bayron Guevara
        // +   improved by: Thunder.m
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   bugfixed by: Pellentesque Malesuada
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // -    depends on: this.utf8Encode
        // *     example 1: this.base64Encode('Kevin van Zonneveld')
        // *     returns 1: 'S2V2aW4gdmFuIFpvbm5ldmVsZA=='
        // mozilla has this native
        // - but breaks in 2.0.0.12!
        // if (typeof this.window['atob'] == 'function') {
        //    return atob(data)
        // }
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = '', tmp_arr = [];
        if (!data) {
            return data;
        }
        data = utf8Encode(data + '');
        do {
            // pack three octets into four hexets
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);
            bits = (o1 << 16) | (o2 << 8) | o3;
            h1 = (bits >> 18) & 0x3f;
            h2 = (bits >> 12) & 0x3f;
            h3 = (bits >> 6) & 0x3f;
            h4 = bits & 0x3f;
            // use hexets to index into b64, and append result to encoded string
            tmp_arr[ac++] =
                b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);
        enc = tmp_arr.join('');
        switch (data.length % 3) {
            case 1:
                enc = enc.slice(0, -2) + '==';
                break;
            case 2:
                enc = enc.slice(0, -1) + '=';
                break;
        }
        return enc;
    }
    function base64Decode(data) {
        // http://kevin.vanzonneveld.net
        // +   original by: Tyler Akins (http://rumkin.com)
        // +   improved by: Thunder.m
        // +      input by: Aman Gupta
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   bugfixed by: Onno Marsman
        // +   bugfixed by: Pellentesque Malesuada
        // +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +      input by: Brett Zamir (http://brett-zamir.me)
        // +   bugfixed by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // *     example 1: base64_decode('S2V2aW4gdmFuIFpvbm5ldmVsZA==')
        // *     returns 1: 'Kevin van Zonneveld'
        // mozilla has this native
        // - but breaks in 2.0.0.12!
        // if (typeof this.window['atob'] == 'function') {
        //    return atob(data)
        // }
        var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = '', tmp_arr = [];
        if (!data) {
            return data;
        }
        data += '';
        do { // unpack four hexets into three octets using index points in b64
            h1 = b64.indexOf(data.charAt(i++));
            h2 = b64.indexOf(data.charAt(i++));
            h3 = b64.indexOf(data.charAt(i++));
            h4 = b64.indexOf(data.charAt(i++));
            bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
            o1 = bits >> 16 & 0xff;
            o2 = bits >> 8 & 0xff;
            o3 = bits & 0xff;
            if (h3 === 64) {
                tmp_arr[ac++] = String.fromCharCode(o1);
            }
            else if (h4 === 64) {
                tmp_arr[ac++] = String.fromCharCode(o1, o2);
            }
            else {
                tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
            }
        } while (i < data.length);
        dec = tmp_arr.join('');
        return dec;
    }
    function urlSafeBase64Encode(v) {
        v = base64Encode(v);
        return v.replace(/\//g, '_').replace(/\+/g, '-');
    }
    function urlSafeBase64Decode(v) {
        v = v.replace(/_/g, '/').replace(/-/g, '+');
        return base64Decode(v);
    }
    //# sourceMappingURL=base64.js.map

    var __assign = (undefined && undefined.__assign) || function () {
        __assign = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var MB = Math.pow(1024, 2);
    // 文件分块
    function getChunks(file, blockSize) {
        var chunkByteSize = blockSize * MB; // 转换为字节
        // 如果 chunkByteSize 比文件大，则直接取文件的大小
        if (chunkByteSize > file.size) {
            chunkByteSize = file.size;
        }
        else {
            // 因为最多 10000 chunk，所以如果 chunkSize 不符合则把每片 chunk 大小扩大两倍
            while (file.size > chunkByteSize * 10000) {
                chunkByteSize *= 2;
            }
        }
        var chunks = [];
        var count = Math.ceil(file.size / chunkByteSize);
        for (var i = 0; i < count; i++) {
            var chunk = file.slice(chunkByteSize * i, i === count - 1 ? file.size : chunkByteSize * (i + 1));
            chunks.push(chunk);
        }
        return chunks;
    }
    function isMetaDataValid(params) {
        return Object.keys(params).every(function (key) { return key.indexOf('x-qn-meta-') === 0; });
    }
    function isCustomVarsValid(params) {
        return Object.keys(params).every(function (key) { return key.indexOf('x:') === 0; });
    }
    function sum(list) {
        return list.reduce(function (data, loaded) { return data + loaded; }, 0);
    }
    function setLocalFileInfo(localKey, info) {
        try {
            localStorage.setItem(localKey, JSON.stringify(info));
        }
        catch (err) {
            if (window.console && window.console.warn) {
                // eslint-disable-next-line no-console
                console.warn('setLocalFileInfo failed');
            }
        }
    }
    function createLocalKey(name, key, size) {
        var localKey = key == null ? '_' : "_key_" + key + "_";
        return "qiniu_js_sdk_upload_file_name_" + name + localKey + "size_" + size;
    }
    function removeLocalFileInfo(localKey) {
        try {
            localStorage.removeItem(localKey);
        }
        catch (err) {
            if (window.console && window.console.warn) {
                // eslint-disable-next-line no-console
                console.warn('removeLocalFileInfo failed');
            }
        }
    }
    function getLocalFileInfo(localKey) {
        try {
            var localInfo = localStorage.getItem(localKey);
            return localInfo ? JSON.parse(localInfo) : null;
        }
        catch (err) {
            if (window.console && window.console.warn) {
                // eslint-disable-next-line no-console
                console.warn('getLocalFileInfo failed');
            }
            return null;
        }
    }
    function getAuthHeaders(token) {
        var auth = 'UpToken ' + token;
        return { Authorization: auth };
    }
    function getHeadersForChunkUpload(token) {
        var header = getAuthHeaders(token);
        return __assign({ 'content-type': 'application/octet-stream' }, header);
    }
    function getHeadersForMkFile(token) {
        var header = getAuthHeaders(token);
        return __assign({ 'content-type': 'application/json' }, header);
    }
    function createXHR() {
        if (window.XMLHttpRequest) {
            return new XMLHttpRequest();
        }
        return window.ActiveXObject('Microsoft.XMLHTTP');
    }
    function computeMd5(data) {
        return __awaiter(this, void 0, void 0, function () {
            var buffer, spark;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, readAsArrayBuffer(data)];
                    case 1:
                        buffer = _a.sent();
                        spark = new sparkMd5.ArrayBuffer();
                        spark.append(buffer);
                        return [2 /*return*/, spark.end()];
                }
            });
        });
    }
    function readAsArrayBuffer(data) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            // evt 类型目前存在问题 https://github.com/Microsoft/TypeScript/issues/4163
            reader.onload = function (evt) {
                if (evt.target) {
                    var body = evt.target.result;
                    resolve(body);
                }
                else {
                    reject(new Error('progress event target is undefined'));
                }
            };
            reader.onerror = function () {
                reject(new Error('fileReader read failed'));
            };
            reader.readAsArrayBuffer(data);
        });
    }
    function request(url, options) {
        return new Promise(function (resolve, reject) {
            var xhr = createXHR();
            xhr.open(options.method, url);
            if (options.onCreate) {
                options.onCreate(xhr);
            }
            if (options.headers) {
                var headers_1 = options.headers;
                Object.keys(headers_1).forEach(function (k) {
                    xhr.setRequestHeader(k, headers_1[k]);
                });
            }
            xhr.upload.addEventListener('progress', function (evt) {
                if (evt.lengthComputable && options.onProgress) {
                    options.onProgress({
                        loaded: evt.loaded,
                        total: evt.total
                    });
                }
            });
            xhr.onreadystatechange = function () {
                var responseText = xhr.responseText;
                if (xhr.readyState !== 4) {
                    return;
                }
                var reqId = xhr.getResponseHeader('x-reqId') || '';
                if (xhr.status !== 200) {
                    var message = "xhr request failed, code: " + xhr.status;
                    if (responseText) {
                        message += " response: " + responseText;
                    }
                    reject({
                        code: xhr.status,
                        message: message,
                        reqId: reqId,
                        isRequestError: true
                    });
                    return;
                }
                try {
                    resolve({
                        data: JSON.parse(responseText),
                        reqId: reqId
                    });
                }
                catch (err) {
                    reject(err);
                }
            };
            xhr.send(options.body);
        });
    }
    function getPortFromUrl(url) {
        if (url && url.match) {
            var groups = url.match(/(^https?)/);
            if (!groups) {
                return '';
            }
            var type = groups[1];
            groups = url.match(/^https?:\/\/([^:^/]*):(\d*)/);
            if (groups) {
                return groups[2];
            }
            if (type === 'http') {
                return '80';
            }
            return '443';
        }
        return '';
    }
    function getDomainFromUrl(url) {
        if (url && url.match) {
            var groups = url.match(/^https?:\/\/([^:^/]*)/);
            return groups ? groups[1] : '';
        }
        return '';
    }
    function getPutPolicy(token) {
        var segments = token.split(':');
        // token 构造的差异参考：https://github.com/qbox/product/blob/master/kodo/auths/UpToken.md#admin-uptoken-authorization
        var ak = segments.length > 3 ? segments[1] : segments[0];
        var putPolicy = JSON.parse(urlSafeBase64Decode(segments[segments.length - 1]));
        return {
            ak: ak,
            bucket: putPolicy.scope.split(':')[0]
        };
    }
    function createObjectURL(file) {
        var URL = window.URL || window.webkitURL || window.mozURL;
        return URL.createObjectURL(file);
    }
    function getTransform(image, orientation) {
        var width = image.width, height = image.height;
        switch (orientation) {
            case 1:
                // default
                return {
                    width: width,
                    height: height,
                    matrix: [1, 0, 0, 1, 0, 0]
                };
            case 2:
                // horizontal flip
                return {
                    width: width,
                    height: height,
                    matrix: [-1, 0, 0, 1, width, 0]
                };
            case 3:
                // 180° rotated
                return {
                    width: width,
                    height: height,
                    matrix: [-1, 0, 0, -1, width, height]
                };
            case 4:
                // vertical flip
                return {
                    width: width,
                    height: height,
                    matrix: [1, 0, 0, -1, 0, height]
                };
            case 5:
                // vertical flip + -90° rotated
                return {
                    width: height,
                    height: width,
                    matrix: [0, 1, 1, 0, 0, 0]
                };
            case 6:
                // -90° rotated
                return {
                    width: height,
                    height: width,
                    matrix: [0, 1, -1, 0, height, 0]
                };
            case 7:
                // horizontal flip + -90° rotate
                return {
                    width: height,
                    height: width,
                    matrix: [0, -1, -1, 0, height, width]
                };
            case 8:
                // 90° rotated
                return {
                    width: height,
                    height: width,
                    matrix: [0, -1, 1, 0, 0, width]
                };
            default:
                throw new Error("orientation " + orientation + " is unavailable");
        }
    }
    //# sourceMappingURL=utils.js.map

    var StatisticsLogger = /** @class */ (function () {
        function StatisticsLogger() {
        }
        StatisticsLogger.prototype.log = function (info, token) {
            var logString = Object.values(info).join(',');
            this.send(logString, token, 0);
        };
        StatisticsLogger.prototype.send = function (logString, token, retryCount) {
            var _this = this;
            var xhr = createXHR();
            xhr.open('POST', 'https://uplog.qbox.me/log/3');
            xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
            xhr.setRequestHeader('Authorization', 'UpToken ' + token);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && xhr.status !== 200 && ++retryCount <= 3) {
                    _this.send(logString, token, retryCount);
                }
            };
            xhr.send(logString);
        };
        return StatisticsLogger;
    }());
    //# sourceMappingURL=statisticsLog.js.map

    var Pool = /** @class */ (function () {
        function Pool(runTask, limit) {
            this.runTask = runTask;
            this.limit = limit;
            this.queue = [];
            this.processing = [];
        }
        Pool.prototype.enqueue = function (task) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                _this.queue.push({
                    task: task,
                    resolve: resolve,
                    reject: reject
                });
                _this.check();
            });
        };
        Pool.prototype.run = function (item) {
            var _this = this;
            this.queue = this.queue.filter(function (v) { return v !== item; });
            this.processing.push(item);
            this.runTask(item.task).then(function () {
                _this.processing = _this.processing.filter(function (v) { return v !== item; });
                item.resolve();
                _this.check();
            }, function (err) { return item.reject(err); });
        };
        Pool.prototype.check = function () {
            var _this = this;
            var processingNum = this.processing.length;
            var availableNum = this.limit - processingNum;
            this.queue.slice(0, availableNum).forEach(function (item) {
                _this.run(item);
            });
        };
        return Pool;
    }());
    //# sourceMappingURL=pool.js.map

    var _a;
    /** 上传区域 */
    var region = {
        z0: 'z0',
        z1: 'z1',
        z2: 'z2',
        na0: 'na0',
        as0: 'as0'
    };
    /** 上传区域对应的 host */
    var regionUphostMap = (_a = {},
        _a[region.z0] = {
            srcUphost: 'up.qiniup.com',
            cdnUphost: 'upload.qiniup.com'
        },
        _a[region.z1] = {
            srcUphost: 'up-z1.qiniup.com',
            cdnUphost: 'upload-z1.qiniup.com'
        },
        _a[region.z2] = {
            srcUphost: 'up-z2.qiniup.com',
            cdnUphost: 'upload-z2.qiniup.com'
        },
        _a[region.na0] = {
            srcUphost: 'up-na0.qiniup.com',
            cdnUphost: 'upload-na0.qiniup.com'
        },
        _a[region.as0] = {
            srcUphost: 'up-as0.qiniup.com',
            cdnUphost: 'upload-as0.qiniup.com'
        },
        _a);
    //# sourceMappingURL=config.js.map

    var __assign$1 = (undefined && undefined.__assign) || function () {
        __assign$1 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$1.apply(this, arguments);
    };
    var __awaiter$1 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$1 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    function getUpHosts(token, protocol) {
        return __awaiter$1(this, void 0, void 0, function () {
            var putPolicy, url;
            return __generator$1(this, function (_a) {
                putPolicy = getPutPolicy(token);
                url = protocol + '//api.qiniu.com/v2/query?ak=' + putPolicy.ak + '&bucket=' + putPolicy.bucket;
                return [2 /*return*/, request(url, { method: 'GET' })];
            });
        });
    }
    /** 获取上传url */
    function getUploadUrl(config, token) {
        return __awaiter$1(this, void 0, void 0, function () {
            var protocol, upHosts, host, res, hosts;
            return __generator$1(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        protocol = config.upprotocol;
                        if (config.uphost) {
                            return [2 /*return*/, protocol + "//" + config.uphost];
                        }
                        if (config.region) {
                            upHosts = regionUphostMap[config.region];
                            host = config.useCdnDomain ? upHosts.cdnUphost : upHosts.srcUphost;
                            return [2 /*return*/, protocol + "//" + host];
                        }
                        return [4 /*yield*/, getUpHosts(token, protocol)];
                    case 1:
                        res = _a.sent();
                        hosts = res.data.up.acc.main;
                        return [2 /*return*/, protocol + "//" + hosts[0]];
                }
            });
        });
    }
    /**
     * @param bucket 空间名
     * @param key 目标文件名
     * @param uploadInfo 上传信息
     */
    function getBaseUrl(bucket, key, uploadInfo) {
        var url = uploadInfo.url, id = uploadInfo.id;
        return url + "/buckets/" + bucket + "/objects/" + (key != null ? urlSafeBase64Encode(key) : '~') + "/uploads/" + id;
    }
    /**
     * @param token 上传鉴权凭证
     * @param bucket 上传空间
     * @param key 目标文件名
     * @param uploadUrl 上传地址
     */
    function initUploadParts(token, bucket, key, uploadUrl) {
        var url = uploadUrl + "/buckets/" + bucket + "/objects/" + (key != null ? urlSafeBase64Encode(key) : '~') + "/uploads";
        return request(url, {
            method: 'POST',
            headers: getAuthHeaders(token)
        });
    }
    /**
     * @param token 上传鉴权凭证
     * @param index 当前 chunk 的索引
     * @param uploadInfo 上传信息
     * @param options 请求参数
     */
    function uploadChunk(token, key, index, uploadInfo, options) {
        var bucket = getPutPolicy(token).bucket;
        var url = getBaseUrl(bucket, key, uploadInfo) + ("/" + index);
        return request(url, __assign$1(__assign$1({}, options), { method: 'PUT', headers: getHeadersForChunkUpload(token) }));
    }
    /**
     * @param token 上传鉴权凭证
     * @param key 目标文件名
     * @param uploadInfo 上传信息
     * @param options 请求参数
     */
    function uploadComplete(token, key, uploadInfo, options) {
        var bucket = getPutPolicy(token).bucket;
        var url = getBaseUrl(bucket, key, uploadInfo);
        return request(url, __assign$1(__assign$1({}, options), { method: 'POST', headers: getHeadersForMkFile(token) }));
    }
    /**
     * @param token 上传鉴权凭证
     * @param key 目标文件名
     * @param uploadInfo 上传信息
     */
    function deleteUploadedChunks(token, key, uploadinfo) {
        var bucket = getPutPolicy(token).bucket;
        var url = getBaseUrl(bucket, key, uploadinfo);
        return request(url, {
            method: 'DELETE',
            headers: getAuthHeaders(token)
        });
    }
    //# sourceMappingURL=api.js.map

    var __assign$2 = (undefined && undefined.__assign) || function () {
        __assign$2 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$2.apply(this, arguments);
    };
    var __awaiter$2 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$2 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var DEFAULT_CHUNK_SIZE = 4; // 单位 MB
    var GB = Math.pow(1024, 3);
    var Base = /** @class */ (function () {
        function Base(options, handlers, statisticsLogger) {
            this.statisticsLogger = statisticsLogger;
            this.xhrList = [];
            this.aborted = false;
            this.retryCount = 0;
            this.config = __assign$2({ useCdnDomain: true, disableStatisticsReport: false, retryCount: 3, checkByMD5: false, uphost: '', upprotocol: 'https:', forceDirect: false, chunkSize: DEFAULT_CHUNK_SIZE, concurrentRequestLimit: 3 }, options.config);
            this.putExtra = __assign$2({ fname: '' }, options.putExtra);
            this.file = options.file;
            this.key = options.key;
            this.token = options.token;
            this.onData = handlers.onData;
            this.onError = handlers.onError;
            this.onComplete = handlers.onComplete;
            try {
                this.bucket = getPutPolicy(this.token).bucket;
            }
            catch (e) {
                this.onError(e);
            }
        }
        Base.prototype.putFile = function () {
            return __awaiter$2(this, void 0, void 0, function () {
                var err, err, err, _a, result, err_1, reqId, code, needRetry, notReachRetryCount;
                return __generator$2(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.aborted = false;
                            if (!this.putExtra.fname) {
                                this.putExtra.fname = this.file.name;
                            }
                            if (this.file.size > 10000 * GB) {
                                err = new Error('file size exceed maximum value 10000G');
                                this.onError(err);
                                throw err;
                            }
                            if (this.putExtra.customVars) {
                                if (!isCustomVarsValid(this.putExtra.customVars)) {
                                    err = new Error('customVars key should start width x:');
                                    this.onError(err);
                                    throw err;
                                }
                            }
                            if (this.putExtra.metadata) {
                                if (!isMetaDataValid(this.putExtra.metadata)) {
                                    err = new Error('metadata key should start with x-qn-meta-');
                                    this.onError(err);
                                    throw err;
                                }
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 4, , 5]);
                            _a = this;
                            return [4 /*yield*/, getUploadUrl(this.config, this.token)];
                        case 2:
                            _a.uploadUrl = _b.sent();
                            this.uploadAt = new Date().getTime();
                            return [4 /*yield*/, this.run()];
                        case 3:
                            result = _b.sent();
                            this.onComplete(result.data);
                            if (!this.config.disableStatisticsReport) {
                                this.sendLog(result.reqId, 200);
                            }
                            return [2 /*return*/, result];
                        case 4:
                            err_1 = _b.sent();
                            this.clear();
                            if (err_1.isRequestError && !this.config.disableStatisticsReport) {
                                reqId = this.aborted ? '' : err_1.reqId;
                                code = this.aborted ? -2 : err_1.code;
                                this.sendLog(reqId, code);
                            }
                            needRetry = err_1.isRequestError && err_1.code === 0 && !this.aborted;
                            notReachRetryCount = ++this.retryCount <= this.config.retryCount;
                            // 以下条件满足其中之一则会进行重新上传：
                            // 1. 满足 needRetry 的条件且 retryCount 不为 0
                            // 2. uploadId 无效时在 resume 里会清除本地数据，并且这里触发重新上传
                            if (needRetry && notReachRetryCount || err_1.code === 612) {
                                return [2 /*return*/, this.putFile()];
                            }
                            this.onError(err_1);
                            throw err_1;
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        Base.prototype.clear = function () {
            this.xhrList.forEach(function (xhr) { return xhr.abort(); });
            this.xhrList = [];
        };
        Base.prototype.stop = function () {
            this.clear();
            this.aborted = true;
        };
        Base.prototype.addXhr = function (xhr) {
            this.xhrList.push(xhr);
        };
        Base.prototype.sendLog = function (reqId, code) {
            this.statisticsLogger.log({
                code: code,
                reqId: reqId,
                host: getDomainFromUrl(this.uploadUrl),
                remoteIp: '',
                port: getPortFromUrl(this.uploadUrl),
                duration: (new Date().getTime() - this.uploadAt) / 1000,
                time: Math.floor(this.uploadAt / 1000),
                bytesSent: this.progress ? this.progress.total.loaded : 0,
                upType: 'jssdk-h5',
                size: this.file.size
            }, this.token);
        };
        Base.prototype.getProgressInfoItem = function (loaded, size) {
            return {
                loaded: loaded,
                size: size,
                percent: loaded / size * 100
            };
        };
        return Base;
    }());
    //# sourceMappingURL=base.js.map

    var __extends = (undefined && undefined.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __assign$3 = (undefined && undefined.__assign) || function () {
        __assign$3 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$3.apply(this, arguments);
    };
    var __awaiter$3 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$3 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    /** 是否为正整数 */
    function isPositiveInteger(n) {
        var re = /^[1-9]\d*$/;
        return re.test(String(n));
    }
    var Resume = /** @class */ (function (_super) {
        __extends(Resume, _super);
        function Resume() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Resume.prototype.run = function () {
            return __awaiter$3(this, void 0, void 0, function () {
                var pool, uploadChunks, result;
                var _this = this;
                return __generator$3(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!this.config.chunkSize || !isPositiveInteger(this.config.chunkSize)) {
                                throw new Error('chunkSize must be a positive integer');
                            }
                            if (this.config.chunkSize > 1024) {
                                throw new Error('chunkSize maximum value is 1024');
                            }
                            return [4 /*yield*/, this.initBeforeUploadChunks()];
                        case 1:
                            _a.sent();
                            pool = new Pool(function (chunkInfo) { return _this.uploadChunk(chunkInfo); }, this.config.concurrentRequestLimit);
                            uploadChunks = this.chunks.map(function (chunk, index) { return pool.enqueue({ chunk: chunk, index: index }); });
                            result = Promise.all(uploadChunks).then(function () { return _this.mkFileReq(); });
                            result.then(function () {
                                removeLocalFileInfo(_this.getLocalKey());
                            }, function (err) {
                                // uploadId 无效，上传参数有误（多由于本地存储信息的 uploadId 失效
                                if (err.code === 612 || err.code === 400) {
                                    removeLocalFileInfo(_this.getLocalKey());
                                }
                            });
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        Resume.prototype.uploadChunk = function (chunkInfo) {
            return __awaiter$3(this, void 0, void 0, function () {
                var index, chunk, info, shouldCheckMD5, reuseSaved, md5, onProgress, requestOptions, response;
                var _this = this;
                return __generator$3(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            index = chunkInfo.index, chunk = chunkInfo.chunk;
                            info = this.uploadedList[index];
                            shouldCheckMD5 = this.config.checkByMD5;
                            reuseSaved = function () {
                                _this.updateChunkProgress(chunk.size, index);
                            };
                            if (info && !shouldCheckMD5) {
                                reuseSaved();
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, computeMd5(chunk)];
                        case 1:
                            md5 = _a.sent();
                            if (info && md5 === info.md5) {
                                reuseSaved();
                                return [2 /*return*/];
                            }
                            onProgress = function (data) {
                                _this.updateChunkProgress(data.loaded, index);
                            };
                            requestOptions = {
                                body: chunk,
                                onProgress: onProgress,
                                onCreate: function (xhr) { return _this.addXhr(xhr); }
                            };
                            return [4 /*yield*/, uploadChunk(this.token, this.key, chunkInfo.index + 1, this.getUploadInfo(), requestOptions)
                                // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里在每次分片上传完成后都手动更新下 progress
                            ];
                        case 2:
                            response = _a.sent();
                            // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里在每次分片上传完成后都手动更新下 progress
                            onProgress({
                                loaded: chunk.size,
                                total: chunk.size
                            });
                            this.uploadedList[index] = {
                                etag: response.data.etag,
                                md5: response.data.md5,
                                size: chunk.size
                            };
                            setLocalFileInfo(this.getLocalKey(), {
                                id: this.uploadId,
                                data: this.uploadedList
                            });
                            return [2 /*return*/];
                    }
                });
            });
        };
        Resume.prototype.mkFileReq = function () {
            return __awaiter$3(this, void 0, void 0, function () {
                var data, result;
                var _this = this;
                return __generator$3(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            data = __assign$3(__assign$3(__assign$3({ parts: this.uploadedList.map(function (value, index) { return ({
                                    etag: value.etag,
                                    partNumber: index + 1
                                }); }), fname: this.putExtra.fname }, this.putExtra.mimeType && { mimeType: this.putExtra.mimeType }), this.putExtra.customVars && { customVars: this.putExtra.customVars }), this.putExtra.metadata && { metadata: this.putExtra.metadata });
                            return [4 /*yield*/, uploadComplete(this.token, this.key, this.getUploadInfo(), {
                                    onCreate: function (xhr) { return _this.addXhr(xhr); },
                                    body: JSON.stringify(data)
                                })];
                        case 1:
                            result = _a.sent();
                            this.updateMkFileProgress(1);
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        Resume.prototype.initBeforeUploadChunks = function () {
            return __awaiter$3(this, void 0, void 0, function () {
                var localInfo, res;
                return __generator$3(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            localInfo = getLocalFileInfo(this.getLocalKey());
                            if (!!localInfo) return [3 /*break*/, 2];
                            // 防止本地信息已被破坏，初始化时 clear 一下
                            removeLocalFileInfo(this.getLocalKey());
                            return [4 /*yield*/, initUploadParts(this.token, this.bucket, this.key, this.uploadUrl)];
                        case 1:
                            res = _a.sent();
                            this.uploadId = res.data.uploadId;
                            this.uploadedList = [];
                            return [3 /*break*/, 3];
                        case 2:
                            this.uploadId = localInfo.id;
                            this.uploadedList = localInfo.data;
                            _a.label = 3;
                        case 3:
                            this.chunks = getChunks(this.file, this.config.chunkSize);
                            this.loaded = {
                                mkFileProgress: 0,
                                chunks: this.chunks.map(function (_) { return 0; })
                            };
                            this.notifyResumeProgress();
                            return [2 /*return*/];
                    }
                });
            });
        };
        Resume.prototype.getUploadInfo = function () {
            return {
                id: this.uploadId,
                url: this.uploadUrl
            };
        };
        Resume.prototype.getLocalKey = function () {
            return createLocalKey(this.file.name, this.key, this.file.size);
        };
        Resume.prototype.updateChunkProgress = function (loaded, index) {
            this.loaded.chunks[index] = loaded;
            this.notifyResumeProgress();
        };
        Resume.prototype.updateMkFileProgress = function (progress) {
            this.loaded.mkFileProgress = progress;
            this.notifyResumeProgress();
        };
        Resume.prototype.notifyResumeProgress = function () {
            var _this = this;
            this.progress = {
                total: this.getProgressInfoItem(sum(this.loaded.chunks) + this.loaded.mkFileProgress, this.file.size + 1 // 防止在 complete 未调用的时候进度显示 100%
                ),
                chunks: this.chunks.map(function (chunk, index) { return (_this.getProgressInfoItem(_this.loaded.chunks[index], chunk.size)); }),
                uploadInfo: {
                    id: this.uploadId,
                    url: this.uploadUrl
                }
            };
            this.onData(this.progress);
        };
        return Resume;
    }(Base));
    //# sourceMappingURL=resume.js.map

    var __extends$1 = (undefined && undefined.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __awaiter$4 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$4 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var Direct = /** @class */ (function (_super) {
        __extends$1(Direct, _super);
        function Direct() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        Direct.prototype.run = function () {
            return __awaiter$4(this, void 0, void 0, function () {
                var formData, customVars_1, result;
                var _this = this;
                return __generator$4(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            formData = new FormData();
                            formData.append('file', this.file);
                            formData.append('token', this.token);
                            if (this.key != null) {
                                formData.append('key', this.key);
                            }
                            formData.append('fname', this.putExtra.fname);
                            if (this.putExtra.customVars) {
                                customVars_1 = this.putExtra.customVars;
                                Object.keys(customVars_1).forEach(function (key) { return formData.append(key, customVars_1[key].toString()); });
                            }
                            return [4 /*yield*/, request(this.uploadUrl, {
                                    method: 'POST',
                                    body: formData,
                                    onProgress: function (data) {
                                        _this.updateDirectProgress(data.loaded, data.total);
                                    },
                                    onCreate: function (xhr) { return _this.addXhr(xhr); }
                                })];
                        case 1:
                            result = _a.sent();
                            this.finishDirectProgress();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        Direct.prototype.updateDirectProgress = function (loaded, total) {
            // 当请求未完成时可能进度会达到100，所以total + 1来防止这种情况出现
            this.progress = { total: this.getProgressInfoItem(loaded, total + 1) };
            this.onData(this.progress);
        };
        Direct.prototype.finishDirectProgress = function () {
            // 在某些浏览器环境下，xhr 的 progress 事件无法被触发，progress 为 null，这里 fake 下
            if (!this.progress) {
                this.progress = { total: this.getProgressInfoItem(this.file.size, this.file.size) };
                this.onData(this.progress);
                return;
            }
            var total = this.progress.total;
            this.progress = { total: this.getProgressInfoItem(total.loaded + 1, total.size) };
            this.onData(this.progress);
        };
        return Direct;
    }(Base));
    //# sourceMappingURL=direct.js.map

    function createUploadManager(options, handlers, statisticsLogger) {
        if (options.config && options.config.forceDirect) {
            return new Direct(options, handlers, statisticsLogger);
        }
        return options.file.size > 4 * MB
            ? new Resume(options, handlers, statisticsLogger)
            : new Direct(options, handlers, statisticsLogger);
    }
    //# sourceMappingURL=index.js.map

    var __extends$2 = (undefined && undefined.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __assign$4 = (undefined && undefined.__assign) || function () {
        __assign$4 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$4.apply(this, arguments);
    };
    /** 表示可清理的资源，比如 Observable 的执行 */
    var Subscription = /** @class */ (function () {
        function Subscription() {
            /** 用来标示该 Subscription 是否被取消订阅的标示位 */
            this.closed = false;
        }
        /** 取消 observer 的订阅 */
        Subscription.prototype.unsubscribe = function () {
            if (this.closed) {
                return;
            }
            this.closed = true;
            if (this._unsubscribe) {
                this._unsubscribe();
            }
        };
        /** 添加一个 tear down 在该 Subscription 的 unsubscribe() 期间调用 */
        Subscription.prototype.add = function (teardown) {
            this._unsubscribe = teardown;
        };
        return Subscription;
    }());
    /**
     * 实现 Observer 接口并且继承 Subscription 类，Observer 是消费 Observable 值的公有 API
     * 所有 Observers 都转化成了 Subscriber，以便提供类似 Subscription 的能力，比如 unsubscribe
    */
    var Subscriber = /** @class */ (function (_super) {
        __extends$2(Subscriber, _super);
        function Subscriber(observerOrNext, error, complete) {
            var _this = _super.call(this) || this;
            _this.isStopped = false;
            if (observerOrNext && typeof observerOrNext === 'object') {
                _this.destination = observerOrNext;
            }
            else {
                _this.destination = __assign$4(__assign$4(__assign$4({}, observerOrNext && { next: observerOrNext }), error && { error: error }), complete && { complete: complete });
            }
            return _this;
        }
        Subscriber.prototype.unsubscribe = function () {
            if (this.closed) {
                return;
            }
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
        };
        Subscriber.prototype.next = function (value) {
            if (!this.isStopped && this.destination.next) {
                this.destination.next(value);
            }
        };
        Subscriber.prototype.error = function (err) {
            if (!this.isStopped && this.destination.error) {
                this.isStopped = true;
                this.destination.error(err);
            }
        };
        Subscriber.prototype.complete = function (result) {
            if (!this.isStopped && this.destination.complete) {
                this.isStopped = true;
                this.destination.complete(result);
            }
        };
        return Subscriber;
    }(Subscription));
    /** 可观察对象，当前的上传事件的集合 */
    var Observable = /** @class */ (function () {
        function Observable(_subscribe) {
            this._subscribe = _subscribe;
        }
        Observable.prototype.subscribe = function (observerOrNext, error, complete) {
            var sink = new Subscriber(observerOrNext, error, complete);
            sink.add(this._subscribe(sink));
            return sink;
        };
        return Observable;
    }());
    //# sourceMappingURL=observable.js.map

    var exif = createCommonjsModule(function (module, exports) {
    (function() {

        var debug = false;

        var EXIF = function(obj) {
            if (obj instanceof EXIF) return obj;
            if (!(this instanceof EXIF)) return new EXIF(obj);
            this.EXIFwrapped = obj;
        };

        {
            if ( module.exports) {
                exports = module.exports = EXIF;
            }
            exports.EXIF = EXIF;
        }

        var ExifTags = EXIF.Tags = {

            // version tags
            0x9000 : "ExifVersion",             // EXIF version
            0xA000 : "FlashpixVersion",         // Flashpix format version

            // colorspace tags
            0xA001 : "ColorSpace",              // Color space information tag

            // image configuration
            0xA002 : "PixelXDimension",         // Valid width of meaningful image
            0xA003 : "PixelYDimension",         // Valid height of meaningful image
            0x9101 : "ComponentsConfiguration", // Information about channels
            0x9102 : "CompressedBitsPerPixel",  // Compressed bits per pixel

            // user information
            0x927C : "MakerNote",               // Any desired information written by the manufacturer
            0x9286 : "UserComment",             // Comments by user

            // related file
            0xA004 : "RelatedSoundFile",        // Name of related sound file

            // date and time
            0x9003 : "DateTimeOriginal",        // Date and time when the original image was generated
            0x9004 : "DateTimeDigitized",       // Date and time when the image was stored digitally
            0x9290 : "SubsecTime",              // Fractions of seconds for DateTime
            0x9291 : "SubsecTimeOriginal",      // Fractions of seconds for DateTimeOriginal
            0x9292 : "SubsecTimeDigitized",     // Fractions of seconds for DateTimeDigitized

            // picture-taking conditions
            0x829A : "ExposureTime",            // Exposure time (in seconds)
            0x829D : "FNumber",                 // F number
            0x8822 : "ExposureProgram",         // Exposure program
            0x8824 : "SpectralSensitivity",     // Spectral sensitivity
            0x8827 : "ISOSpeedRatings",         // ISO speed rating
            0x8828 : "OECF",                    // Optoelectric conversion factor
            0x9201 : "ShutterSpeedValue",       // Shutter speed
            0x9202 : "ApertureValue",           // Lens aperture
            0x9203 : "BrightnessValue",         // Value of brightness
            0x9204 : "ExposureBias",            // Exposure bias
            0x9205 : "MaxApertureValue",        // Smallest F number of lens
            0x9206 : "SubjectDistance",         // Distance to subject in meters
            0x9207 : "MeteringMode",            // Metering mode
            0x9208 : "LightSource",             // Kind of light source
            0x9209 : "Flash",                   // Flash status
            0x9214 : "SubjectArea",             // Location and area of main subject
            0x920A : "FocalLength",             // Focal length of the lens in mm
            0xA20B : "FlashEnergy",             // Strobe energy in BCPS
            0xA20C : "SpatialFrequencyResponse",    //
            0xA20E : "FocalPlaneXResolution",   // Number of pixels in width direction per FocalPlaneResolutionUnit
            0xA20F : "FocalPlaneYResolution",   // Number of pixels in height direction per FocalPlaneResolutionUnit
            0xA210 : "FocalPlaneResolutionUnit",    // Unit for measuring FocalPlaneXResolution and FocalPlaneYResolution
            0xA214 : "SubjectLocation",         // Location of subject in image
            0xA215 : "ExposureIndex",           // Exposure index selected on camera
            0xA217 : "SensingMethod",           // Image sensor type
            0xA300 : "FileSource",              // Image source (3 == DSC)
            0xA301 : "SceneType",               // Scene type (1 == directly photographed)
            0xA302 : "CFAPattern",              // Color filter array geometric pattern
            0xA401 : "CustomRendered",          // Special processing
            0xA402 : "ExposureMode",            // Exposure mode
            0xA403 : "WhiteBalance",            // 1 = auto white balance, 2 = manual
            0xA404 : "DigitalZoomRation",       // Digital zoom ratio
            0xA405 : "FocalLengthIn35mmFilm",   // Equivalent foacl length assuming 35mm film camera (in mm)
            0xA406 : "SceneCaptureType",        // Type of scene
            0xA407 : "GainControl",             // Degree of overall image gain adjustment
            0xA408 : "Contrast",                // Direction of contrast processing applied by camera
            0xA409 : "Saturation",              // Direction of saturation processing applied by camera
            0xA40A : "Sharpness",               // Direction of sharpness processing applied by camera
            0xA40B : "DeviceSettingDescription",    //
            0xA40C : "SubjectDistanceRange",    // Distance to subject

            // other tags
            0xA005 : "InteroperabilityIFDPointer",
            0xA420 : "ImageUniqueID"            // Identifier assigned uniquely to each image
        };

        var TiffTags = EXIF.TiffTags = {
            0x0100 : "ImageWidth",
            0x0101 : "ImageHeight",
            0x8769 : "ExifIFDPointer",
            0x8825 : "GPSInfoIFDPointer",
            0xA005 : "InteroperabilityIFDPointer",
            0x0102 : "BitsPerSample",
            0x0103 : "Compression",
            0x0106 : "PhotometricInterpretation",
            0x0112 : "Orientation",
            0x0115 : "SamplesPerPixel",
            0x011C : "PlanarConfiguration",
            0x0212 : "YCbCrSubSampling",
            0x0213 : "YCbCrPositioning",
            0x011A : "XResolution",
            0x011B : "YResolution",
            0x0128 : "ResolutionUnit",
            0x0111 : "StripOffsets",
            0x0116 : "RowsPerStrip",
            0x0117 : "StripByteCounts",
            0x0201 : "JPEGInterchangeFormat",
            0x0202 : "JPEGInterchangeFormatLength",
            0x012D : "TransferFunction",
            0x013E : "WhitePoint",
            0x013F : "PrimaryChromaticities",
            0x0211 : "YCbCrCoefficients",
            0x0214 : "ReferenceBlackWhite",
            0x0132 : "DateTime",
            0x010E : "ImageDescription",
            0x010F : "Make",
            0x0110 : "Model",
            0x0131 : "Software",
            0x013B : "Artist",
            0x8298 : "Copyright"
        };

        var GPSTags = EXIF.GPSTags = {
            0x0000 : "GPSVersionID",
            0x0001 : "GPSLatitudeRef",
            0x0002 : "GPSLatitude",
            0x0003 : "GPSLongitudeRef",
            0x0004 : "GPSLongitude",
            0x0005 : "GPSAltitudeRef",
            0x0006 : "GPSAltitude",
            0x0007 : "GPSTimeStamp",
            0x0008 : "GPSSatellites",
            0x0009 : "GPSStatus",
            0x000A : "GPSMeasureMode",
            0x000B : "GPSDOP",
            0x000C : "GPSSpeedRef",
            0x000D : "GPSSpeed",
            0x000E : "GPSTrackRef",
            0x000F : "GPSTrack",
            0x0010 : "GPSImgDirectionRef",
            0x0011 : "GPSImgDirection",
            0x0012 : "GPSMapDatum",
            0x0013 : "GPSDestLatitudeRef",
            0x0014 : "GPSDestLatitude",
            0x0015 : "GPSDestLongitudeRef",
            0x0016 : "GPSDestLongitude",
            0x0017 : "GPSDestBearingRef",
            0x0018 : "GPSDestBearing",
            0x0019 : "GPSDestDistanceRef",
            0x001A : "GPSDestDistance",
            0x001B : "GPSProcessingMethod",
            0x001C : "GPSAreaInformation",
            0x001D : "GPSDateStamp",
            0x001E : "GPSDifferential"
        };

         // EXIF 2.3 Spec
        var IFD1Tags = EXIF.IFD1Tags = {
            0x0100: "ImageWidth",
            0x0101: "ImageHeight",
            0x0102: "BitsPerSample",
            0x0103: "Compression",
            0x0106: "PhotometricInterpretation",
            0x0111: "StripOffsets",
            0x0112: "Orientation",
            0x0115: "SamplesPerPixel",
            0x0116: "RowsPerStrip",
            0x0117: "StripByteCounts",
            0x011A: "XResolution",
            0x011B: "YResolution",
            0x011C: "PlanarConfiguration",
            0x0128: "ResolutionUnit",
            0x0201: "JpegIFOffset",    // When image format is JPEG, this value show offset to JPEG data stored.(aka "ThumbnailOffset" or "JPEGInterchangeFormat")
            0x0202: "JpegIFByteCount", // When image format is JPEG, this value shows data size of JPEG image (aka "ThumbnailLength" or "JPEGInterchangeFormatLength")
            0x0211: "YCbCrCoefficients",
            0x0212: "YCbCrSubSampling",
            0x0213: "YCbCrPositioning",
            0x0214: "ReferenceBlackWhite"
        };

        var StringValues = EXIF.StringValues = {
            ExposureProgram : {
                0 : "Not defined",
                1 : "Manual",
                2 : "Normal program",
                3 : "Aperture priority",
                4 : "Shutter priority",
                5 : "Creative program",
                6 : "Action program",
                7 : "Portrait mode",
                8 : "Landscape mode"
            },
            MeteringMode : {
                0 : "Unknown",
                1 : "Average",
                2 : "CenterWeightedAverage",
                3 : "Spot",
                4 : "MultiSpot",
                5 : "Pattern",
                6 : "Partial",
                255 : "Other"
            },
            LightSource : {
                0 : "Unknown",
                1 : "Daylight",
                2 : "Fluorescent",
                3 : "Tungsten (incandescent light)",
                4 : "Flash",
                9 : "Fine weather",
                10 : "Cloudy weather",
                11 : "Shade",
                12 : "Daylight fluorescent (D 5700 - 7100K)",
                13 : "Day white fluorescent (N 4600 - 5400K)",
                14 : "Cool white fluorescent (W 3900 - 4500K)",
                15 : "White fluorescent (WW 3200 - 3700K)",
                17 : "Standard light A",
                18 : "Standard light B",
                19 : "Standard light C",
                20 : "D55",
                21 : "D65",
                22 : "D75",
                23 : "D50",
                24 : "ISO studio tungsten",
                255 : "Other"
            },
            Flash : {
                0x0000 : "Flash did not fire",
                0x0001 : "Flash fired",
                0x0005 : "Strobe return light not detected",
                0x0007 : "Strobe return light detected",
                0x0009 : "Flash fired, compulsory flash mode",
                0x000D : "Flash fired, compulsory flash mode, return light not detected",
                0x000F : "Flash fired, compulsory flash mode, return light detected",
                0x0010 : "Flash did not fire, compulsory flash mode",
                0x0018 : "Flash did not fire, auto mode",
                0x0019 : "Flash fired, auto mode",
                0x001D : "Flash fired, auto mode, return light not detected",
                0x001F : "Flash fired, auto mode, return light detected",
                0x0020 : "No flash function",
                0x0041 : "Flash fired, red-eye reduction mode",
                0x0045 : "Flash fired, red-eye reduction mode, return light not detected",
                0x0047 : "Flash fired, red-eye reduction mode, return light detected",
                0x0049 : "Flash fired, compulsory flash mode, red-eye reduction mode",
                0x004D : "Flash fired, compulsory flash mode, red-eye reduction mode, return light not detected",
                0x004F : "Flash fired, compulsory flash mode, red-eye reduction mode, return light detected",
                0x0059 : "Flash fired, auto mode, red-eye reduction mode",
                0x005D : "Flash fired, auto mode, return light not detected, red-eye reduction mode",
                0x005F : "Flash fired, auto mode, return light detected, red-eye reduction mode"
            },
            SensingMethod : {
                1 : "Not defined",
                2 : "One-chip color area sensor",
                3 : "Two-chip color area sensor",
                4 : "Three-chip color area sensor",
                5 : "Color sequential area sensor",
                7 : "Trilinear sensor",
                8 : "Color sequential linear sensor"
            },
            SceneCaptureType : {
                0 : "Standard",
                1 : "Landscape",
                2 : "Portrait",
                3 : "Night scene"
            },
            SceneType : {
                1 : "Directly photographed"
            },
            CustomRendered : {
                0 : "Normal process",
                1 : "Custom process"
            },
            WhiteBalance : {
                0 : "Auto white balance",
                1 : "Manual white balance"
            },
            GainControl : {
                0 : "None",
                1 : "Low gain up",
                2 : "High gain up",
                3 : "Low gain down",
                4 : "High gain down"
            },
            Contrast : {
                0 : "Normal",
                1 : "Soft",
                2 : "Hard"
            },
            Saturation : {
                0 : "Normal",
                1 : "Low saturation",
                2 : "High saturation"
            },
            Sharpness : {
                0 : "Normal",
                1 : "Soft",
                2 : "Hard"
            },
            SubjectDistanceRange : {
                0 : "Unknown",
                1 : "Macro",
                2 : "Close view",
                3 : "Distant view"
            },
            FileSource : {
                3 : "DSC"
            },

            Components : {
                0 : "",
                1 : "Y",
                2 : "Cb",
                3 : "Cr",
                4 : "R",
                5 : "G",
                6 : "B"
            }
        };

        function imageHasData(img) {
            return !!(img.exifdata);
        }


        function base64ToArrayBuffer(base64, contentType) {
            contentType = contentType || base64.match(/^data\:([^\;]+)\;base64,/mi)[1] || ''; // e.g. 'data:image/jpeg;base64,...' => 'image/jpeg'
            base64 = base64.replace(/^data\:([^\;]+)\;base64,/gmi, '');
            var binary = atob(base64);
            var len = binary.length;
            var buffer = new ArrayBuffer(len);
            var view = new Uint8Array(buffer);
            for (var i = 0; i < len; i++) {
                view[i] = binary.charCodeAt(i);
            }
            return buffer;
        }

        function objectURLToBlob(url, callback) {
            var http = new XMLHttpRequest();
            http.open("GET", url, true);
            http.responseType = "blob";
            http.onload = function(e) {
                if (this.status == 200 || this.status === 0) {
                    callback(this.response);
                }
            };
            http.send();
        }

        function getImageData(img, callback) {
            function handleBinaryFile(binFile) {
                var data = findEXIFinJPEG(binFile);
                img.exifdata = data || {};
                var iptcdata = findIPTCinJPEG(binFile);
                img.iptcdata = iptcdata || {};
                if (EXIF.isXmpEnabled) {
                   var xmpdata= findXMPinJPEG(binFile);
                   img.xmpdata = xmpdata || {};               
                }
                if (callback) {
                    callback.call(img);
                }
            }

            if (img.src) {
                if (/^data\:/i.test(img.src)) { // Data URI
                    var arrayBuffer = base64ToArrayBuffer(img.src);
                    handleBinaryFile(arrayBuffer);

                } else if (/^blob\:/i.test(img.src)) { // Object URL
                    var fileReader = new FileReader();
                    fileReader.onload = function(e) {
                        handleBinaryFile(e.target.result);
                    };
                    objectURLToBlob(img.src, function (blob) {
                        fileReader.readAsArrayBuffer(blob);
                    });
                } else {
                    var http = new XMLHttpRequest();
                    http.onload = function() {
                        if (this.status == 200 || this.status === 0) {
                            handleBinaryFile(http.response);
                        } else {
                            throw "Could not load image";
                        }
                        http = null;
                    };
                    http.open("GET", img.src, true);
                    http.responseType = "arraybuffer";
                    http.send(null);
                }
            } else if (self.FileReader && (img instanceof self.Blob || img instanceof self.File)) {
                var fileReader = new FileReader();
                fileReader.onload = function(e) {
                    handleBinaryFile(e.target.result);
                };

                fileReader.readAsArrayBuffer(img);
            }
        }

        function findEXIFinJPEG(file) {
            var dataView = new DataView(file);
            if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
                return false; // not a valid jpeg
            }

            var offset = 2,
                length = file.byteLength,
                marker;

            while (offset < length) {
                if (dataView.getUint8(offset) != 0xFF) {
                    return false; // not a valid marker, something is wrong
                }

                marker = dataView.getUint8(offset + 1);

                // we could implement handling for other markers here,
                // but we're only looking for 0xFFE1 for EXIF data

                if (marker == 225) {

                    return readEXIFData(dataView, offset + 4, dataView.getUint16(offset + 2) - 2);

                    // offset += 2 + file.getShortAt(offset+2, true);

                } else {
                    offset += 2 + dataView.getUint16(offset+2);
                }

            }

        }

        function findIPTCinJPEG(file) {
            var dataView = new DataView(file);
            if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
                return false; // not a valid jpeg
            }

            var offset = 2,
                length = file.byteLength;


            var isFieldSegmentStart = function(dataView, offset){
                return (
                    dataView.getUint8(offset) === 0x38 &&
                    dataView.getUint8(offset+1) === 0x42 &&
                    dataView.getUint8(offset+2) === 0x49 &&
                    dataView.getUint8(offset+3) === 0x4D &&
                    dataView.getUint8(offset+4) === 0x04 &&
                    dataView.getUint8(offset+5) === 0x04
                );
            };

            while (offset < length) {

                if ( isFieldSegmentStart(dataView, offset )){

                    // Get the length of the name header (which is padded to an even number of bytes)
                    var nameHeaderLength = dataView.getUint8(offset+7);
                    if(nameHeaderLength % 2 !== 0) nameHeaderLength += 1;
                    // Check for pre photoshop 6 format
                    if(nameHeaderLength === 0) {
                        // Always 4
                        nameHeaderLength = 4;
                    }

                    var startOffset = offset + 8 + nameHeaderLength;
                    var sectionLength = dataView.getUint16(offset + 6 + nameHeaderLength);

                    return readIPTCData(file, startOffset, sectionLength);

                }


                // Not the marker, continue searching
                offset++;

            }

        }
        var IptcFieldMap = {
            0x78 : 'caption',
            0x6E : 'credit',
            0x19 : 'keywords',
            0x37 : 'dateCreated',
            0x50 : 'byline',
            0x55 : 'bylineTitle',
            0x7A : 'captionWriter',
            0x69 : 'headline',
            0x74 : 'copyright',
            0x0F : 'category'
        };
        function readIPTCData(file, startOffset, sectionLength){
            var dataView = new DataView(file);
            var data = {};
            var fieldValue, fieldName, dataSize, segmentType;
            var segmentStartPos = startOffset;
            while(segmentStartPos < startOffset+sectionLength) {
                if(dataView.getUint8(segmentStartPos) === 0x1C && dataView.getUint8(segmentStartPos+1) === 0x02){
                    segmentType = dataView.getUint8(segmentStartPos+2);
                    if(segmentType in IptcFieldMap) {
                        dataSize = dataView.getInt16(segmentStartPos+3);
                        fieldName = IptcFieldMap[segmentType];
                        fieldValue = getStringFromDB(dataView, segmentStartPos+5, dataSize);
                        // Check if we already stored a value with this name
                        if(data.hasOwnProperty(fieldName)) {
                            // Value already stored with this name, create multivalue field
                            if(data[fieldName] instanceof Array) {
                                data[fieldName].push(fieldValue);
                            }
                            else {
                                data[fieldName] = [data[fieldName], fieldValue];
                            }
                        }
                        else {
                            data[fieldName] = fieldValue;
                        }
                    }

                }
                segmentStartPos++;
            }
            return data;
        }



        function readTags(file, tiffStart, dirStart, strings, bigEnd) {
            var entries = file.getUint16(dirStart, !bigEnd),
                tags = {},
                entryOffset, tag,
                i;

            for (i=0;i<entries;i++) {
                entryOffset = dirStart + i*12 + 2;
                tag = strings[file.getUint16(entryOffset, !bigEnd)];
                if (!tag && debug) console.log("Unknown tag: " + file.getUint16(entryOffset, !bigEnd));
                tags[tag] = readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd);
            }
            return tags;
        }


        function readTagValue(file, entryOffset, tiffStart, dirStart, bigEnd) {
            var type = file.getUint16(entryOffset+2, !bigEnd),
                numValues = file.getUint32(entryOffset+4, !bigEnd),
                valueOffset = file.getUint32(entryOffset+8, !bigEnd) + tiffStart,
                offset,
                vals, val, n,
                numerator, denominator;

            switch (type) {
                case 1: // byte, 8-bit unsigned int
                case 7: // undefined, 8-bit byte, value depending on field
                    if (numValues == 1) {
                        return file.getUint8(entryOffset + 8, !bigEnd);
                    } else {
                        offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                        vals = [];
                        for (n=0;n<numValues;n++) {
                            vals[n] = file.getUint8(offset + n);
                        }
                        return vals;
                    }

                case 2: // ascii, 8-bit byte
                    offset = numValues > 4 ? valueOffset : (entryOffset + 8);
                    return getStringFromDB(file, offset, numValues-1);

                case 3: // short, 16 bit int
                    if (numValues == 1) {
                        return file.getUint16(entryOffset + 8, !bigEnd);
                    } else {
                        offset = numValues > 2 ? valueOffset : (entryOffset + 8);
                        vals = [];
                        for (n=0;n<numValues;n++) {
                            vals[n] = file.getUint16(offset + 2*n, !bigEnd);
                        }
                        return vals;
                    }

                case 4: // long, 32 bit int
                    if (numValues == 1) {
                        return file.getUint32(entryOffset + 8, !bigEnd);
                    } else {
                        vals = [];
                        for (n=0;n<numValues;n++) {
                            vals[n] = file.getUint32(valueOffset + 4*n, !bigEnd);
                        }
                        return vals;
                    }

                case 5:    // rational = two long values, first is numerator, second is denominator
                    if (numValues == 1) {
                        numerator = file.getUint32(valueOffset, !bigEnd);
                        denominator = file.getUint32(valueOffset+4, !bigEnd);
                        val = new Number(numerator / denominator);
                        val.numerator = numerator;
                        val.denominator = denominator;
                        return val;
                    } else {
                        vals = [];
                        for (n=0;n<numValues;n++) {
                            numerator = file.getUint32(valueOffset + 8*n, !bigEnd);
                            denominator = file.getUint32(valueOffset+4 + 8*n, !bigEnd);
                            vals[n] = new Number(numerator / denominator);
                            vals[n].numerator = numerator;
                            vals[n].denominator = denominator;
                        }
                        return vals;
                    }

                case 9: // slong, 32 bit signed int
                    if (numValues == 1) {
                        return file.getInt32(entryOffset + 8, !bigEnd);
                    } else {
                        vals = [];
                        for (n=0;n<numValues;n++) {
                            vals[n] = file.getInt32(valueOffset + 4*n, !bigEnd);
                        }
                        return vals;
                    }

                case 10: // signed rational, two slongs, first is numerator, second is denominator
                    if (numValues == 1) {
                        return file.getInt32(valueOffset, !bigEnd) / file.getInt32(valueOffset+4, !bigEnd);
                    } else {
                        vals = [];
                        for (n=0;n<numValues;n++) {
                            vals[n] = file.getInt32(valueOffset + 8*n, !bigEnd) / file.getInt32(valueOffset+4 + 8*n, !bigEnd);
                        }
                        return vals;
                    }
            }
        }

        /**
        * Given an IFD (Image File Directory) start offset
        * returns an offset to next IFD or 0 if it's the last IFD.
        */
        function getNextIFDOffset(dataView, dirStart, bigEnd){
            //the first 2bytes means the number of directory entries contains in this IFD
            var entries = dataView.getUint16(dirStart, !bigEnd);

            // After last directory entry, there is a 4bytes of data,
            // it means an offset to next IFD.
            // If its value is '0x00000000', it means this is the last IFD and there is no linked IFD.

            return dataView.getUint32(dirStart + 2 + entries * 12, !bigEnd); // each entry is 12 bytes long
        }

        function readThumbnailImage(dataView, tiffStart, firstIFDOffset, bigEnd){
            // get the IFD1 offset
            var IFD1OffsetPointer = getNextIFDOffset(dataView, tiffStart+firstIFDOffset, bigEnd);

            if (!IFD1OffsetPointer) {
                // console.log('******** IFD1Offset is empty, image thumb not found ********');
                return {};
            }
            else if (IFD1OffsetPointer > dataView.byteLength) { // this should not happen
                // console.log('******** IFD1Offset is outside the bounds of the DataView ********');
                return {};
            }
            // console.log('*******  thumbnail IFD offset (IFD1) is: %s', IFD1OffsetPointer);

            var thumbTags = readTags(dataView, tiffStart, tiffStart + IFD1OffsetPointer, IFD1Tags, bigEnd);

            // EXIF 2.3 specification for JPEG format thumbnail

            // If the value of Compression(0x0103) Tag in IFD1 is '6', thumbnail image format is JPEG.
            // Most of Exif image uses JPEG format for thumbnail. In that case, you can get offset of thumbnail
            // by JpegIFOffset(0x0201) Tag in IFD1, size of thumbnail by JpegIFByteCount(0x0202) Tag.
            // Data format is ordinary JPEG format, starts from 0xFFD8 and ends by 0xFFD9. It seems that
            // JPEG format and 160x120pixels of size are recommended thumbnail format for Exif2.1 or later.

            if (thumbTags['Compression']) {
                // console.log('Thumbnail image found!');

                switch (thumbTags['Compression']) {
                    case 6:
                        // console.log('Thumbnail image format is JPEG');
                        if (thumbTags.JpegIFOffset && thumbTags.JpegIFByteCount) {
                        // extract the thumbnail
                            var tOffset = tiffStart + thumbTags.JpegIFOffset;
                            var tLength = thumbTags.JpegIFByteCount;
                            thumbTags['blob'] = new Blob([new Uint8Array(dataView.buffer, tOffset, tLength)], {
                                type: 'image/jpeg'
                            });
                        }
                    break;

                case 1:
                    console.log("Thumbnail image format is TIFF, which is not implemented.");
                    break;
                default:
                    console.log("Unknown thumbnail image format '%s'", thumbTags['Compression']);
                }
            }
            else if (thumbTags['PhotometricInterpretation'] == 2) {
                console.log("Thumbnail image format is RGB, which is not implemented.");
            }
            return thumbTags;
        }

        function getStringFromDB(buffer, start, length) {
            var outstr = "";
            for (n = start; n < start+length; n++) {
                outstr += String.fromCharCode(buffer.getUint8(n));
            }
            return outstr;
        }

        function readEXIFData(file, start) {
            if (getStringFromDB(file, start, 4) != "Exif") {
                return false;
            }

            var bigEnd,
                tags, tag,
                exifData, gpsData,
                tiffOffset = start + 6;

            // test for TIFF validity and endianness
            if (file.getUint16(tiffOffset) == 0x4949) {
                bigEnd = false;
            } else if (file.getUint16(tiffOffset) == 0x4D4D) {
                bigEnd = true;
            } else {
                return false;
            }

            if (file.getUint16(tiffOffset+2, !bigEnd) != 0x002A) {
                return false;
            }

            var firstIFDOffset = file.getUint32(tiffOffset+4, !bigEnd);

            if (firstIFDOffset < 0x00000008) {
                return false;
            }

            tags = readTags(file, tiffOffset, tiffOffset + firstIFDOffset, TiffTags, bigEnd);

            if (tags.ExifIFDPointer) {
                exifData = readTags(file, tiffOffset, tiffOffset + tags.ExifIFDPointer, ExifTags, bigEnd);
                for (tag in exifData) {
                    switch (tag) {
                        case "LightSource" :
                        case "Flash" :
                        case "MeteringMode" :
                        case "ExposureProgram" :
                        case "SensingMethod" :
                        case "SceneCaptureType" :
                        case "SceneType" :
                        case "CustomRendered" :
                        case "WhiteBalance" :
                        case "GainControl" :
                        case "Contrast" :
                        case "Saturation" :
                        case "Sharpness" :
                        case "SubjectDistanceRange" :
                        case "FileSource" :
                            exifData[tag] = StringValues[tag][exifData[tag]];
                            break;

                        case "ExifVersion" :
                        case "FlashpixVersion" :
                            exifData[tag] = String.fromCharCode(exifData[tag][0], exifData[tag][1], exifData[tag][2], exifData[tag][3]);
                            break;

                        case "ComponentsConfiguration" :
                            exifData[tag] =
                                StringValues.Components[exifData[tag][0]] +
                                StringValues.Components[exifData[tag][1]] +
                                StringValues.Components[exifData[tag][2]] +
                                StringValues.Components[exifData[tag][3]];
                            break;
                    }
                    tags[tag] = exifData[tag];
                }
            }

            if (tags.GPSInfoIFDPointer) {
                gpsData = readTags(file, tiffOffset, tiffOffset + tags.GPSInfoIFDPointer, GPSTags, bigEnd);
                for (tag in gpsData) {
                    switch (tag) {
                        case "GPSVersionID" :
                            gpsData[tag] = gpsData[tag][0] +
                                "." + gpsData[tag][1] +
                                "." + gpsData[tag][2] +
                                "." + gpsData[tag][3];
                            break;
                    }
                    tags[tag] = gpsData[tag];
                }
            }

            // extract thumbnail
            tags['thumbnail'] = readThumbnailImage(file, tiffOffset, firstIFDOffset, bigEnd);

            return tags;
        }

       function findXMPinJPEG(file) {

            if (!('DOMParser' in self)) {
                // console.warn('XML parsing not supported without DOMParser');
                return;
            }
            var dataView = new DataView(file);
            if ((dataView.getUint8(0) != 0xFF) || (dataView.getUint8(1) != 0xD8)) {
               return false; // not a valid jpeg
            }

            var offset = 2,
                length = file.byteLength,
                dom = new DOMParser();

            while (offset < (length-4)) {
                if (getStringFromDB(dataView, offset, 4) == "http") {
                    var startOffset = offset - 1;
                    var sectionLength = dataView.getUint16(offset - 2) - 1;
                    var xmpString = getStringFromDB(dataView, startOffset, sectionLength);
                    var xmpEndIndex = xmpString.indexOf('xmpmeta>') + 8;
                    xmpString = xmpString.substring( xmpString.indexOf( '<x:xmpmeta' ), xmpEndIndex );

                    var indexOfXmp = xmpString.indexOf('x:xmpmeta') + 10;
                    //Many custom written programs embed xmp/xml without any namespace. Following are some of them.
                    //Without these namespaces, XML is thought to be invalid by parsers
                    xmpString = xmpString.slice(0, indexOfXmp)
                                + 'xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/" '
                                + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
                                + 'xmlns:tiff="http://ns.adobe.com/tiff/1.0/" '
                                + 'xmlns:plus="http://schemas.android.com/apk/lib/com.google.android.gms.plus" '
                                + 'xmlns:ext="http://www.gettyimages.com/xsltExtension/1.0" '
                                + 'xmlns:exif="http://ns.adobe.com/exif/1.0/" '
                                + 'xmlns:stEvt="http://ns.adobe.com/xap/1.0/sType/ResourceEvent#" '
                                + 'xmlns:stRef="http://ns.adobe.com/xap/1.0/sType/ResourceRef#" '
                                + 'xmlns:crs="http://ns.adobe.com/camera-raw-settings/1.0/" '
                                + 'xmlns:xapGImg="http://ns.adobe.com/xap/1.0/g/img/" '
                                + 'xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" '
                                + xmpString.slice(indexOfXmp);

                    var domDocument = dom.parseFromString( xmpString, 'text/xml' );
                    return xml2Object(domDocument);
                } else {
                 offset++;
                }
            }
        }

        function xml2json(xml) {
            var json = {};
          
            if (xml.nodeType == 1) { // element node
              if (xml.attributes.length > 0) {
                json['@attributes'] = {};
                for (var j = 0; j < xml.attributes.length; j++) {
                  var attribute = xml.attributes.item(j);
                  json['@attributes'][attribute.nodeName] = attribute.nodeValue;
                }
              }
            } else if (xml.nodeType == 3) { // text node
              return xml.nodeValue;
            }
          
            // deal with children
            if (xml.hasChildNodes()) {
              for(var i = 0; i < xml.childNodes.length; i++) {
                var child = xml.childNodes.item(i);
                var nodeName = child.nodeName;
                if (json[nodeName] == null) {
                  json[nodeName] = xml2json(child);
                } else {
                  if (json[nodeName].push == null) {
                    var old = json[nodeName];
                    json[nodeName] = [];
                    json[nodeName].push(old);
                  }
                  json[nodeName].push(xml2json(child));
                }
              }
            }
            
            return json;
        }

        function xml2Object(xml) {
            try {
                var obj = {};
                if (xml.children.length > 0) {
                  for (var i = 0; i < xml.children.length; i++) {
                    var item = xml.children.item(i);
                    var attributes = item.attributes;
                    for(var idx in attributes) {
                        var itemAtt = attributes[idx];
                        var dataKey = itemAtt.nodeName;
                        var dataValue = itemAtt.nodeValue;

                        if(dataKey !== undefined) {
                            obj[dataKey] = dataValue;
                        }
                    }
                    var nodeName = item.nodeName;

                    if (typeof (obj[nodeName]) == "undefined") {
                      obj[nodeName] = xml2json(item);
                    } else {
                      if (typeof (obj[nodeName].push) == "undefined") {
                        var old = obj[nodeName];

                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                      }
                      obj[nodeName].push(xml2json(item));
                    }
                  }
                } else {
                  obj = xml.textContent;
                }
                return obj;
              } catch (e) {
                  console.log(e.message);
              }
        }

        EXIF.enableXmp = function() {
            EXIF.isXmpEnabled = true;
        };

        EXIF.disableXmp = function() {
            EXIF.isXmpEnabled = false;
        };

        EXIF.getData = function(img, callback) {
            if (((self.Image && img instanceof self.Image)
                || (self.HTMLImageElement && img instanceof self.HTMLImageElement))
                && !img.complete)
                return false;

            if (!imageHasData(img)) {
                getImageData(img, callback);
            } else {
                if (callback) {
                    callback.call(img);
                }
            }
            return true;
        };

        EXIF.getTag = function(img, tag) {
            if (!imageHasData(img)) return;
            return img.exifdata[tag];
        };
        
        EXIF.getIptcTag = function(img, tag) {
            if (!imageHasData(img)) return;
            return img.iptcdata[tag];
        };

        EXIF.getAllTags = function(img) {
            if (!imageHasData(img)) return {};
            var a,
                data = img.exifdata,
                tags = {};
            for (a in data) {
                if (data.hasOwnProperty(a)) {
                    tags[a] = data[a];
                }
            }
            return tags;
        };
        
        EXIF.getAllIptcTags = function(img) {
            if (!imageHasData(img)) return {};
            var a,
                data = img.iptcdata,
                tags = {};
            for (a in data) {
                if (data.hasOwnProperty(a)) {
                    tags[a] = data[a];
                }
            }
            return tags;
        };

        EXIF.pretty = function(img) {
            if (!imageHasData(img)) return "";
            var a,
                data = img.exifdata,
                strPretty = "";
            for (a in data) {
                if (data.hasOwnProperty(a)) {
                    if (typeof data[a] == "object") {
                        if (data[a] instanceof Number) {
                            strPretty += a + " : " + data[a] + " [" + data[a].numerator + "/" + data[a].denominator + "]\r\n";
                        } else {
                            strPretty += a + " : [" + data[a].length + " values]\r\n";
                        }
                    } else {
                        strPretty += a + " : " + data[a] + "\r\n";
                    }
                }
            }
            return strPretty;
        };

        EXIF.readFromBinaryFile = function(file) {
            return findEXIFinJPEG(file);
        };
    }.call(commonjsGlobal));
    });
    var exif_1 = exif.EXIF;

    var __assign$5 = (undefined && undefined.__assign) || function () {
        __assign$5 = Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };
        return __assign$5.apply(this, arguments);
    };
    var __awaiter$5 = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    var __generator$5 = (undefined && undefined.__generator) || function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };
    var __read = (undefined && undefined.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    var __spread = (undefined && undefined.__spread) || function () {
        for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
        return ar;
    };
    var mimeTypes = {
        PNG: 'image/png',
        JPEG: 'image/jpeg',
        WEBP: 'image/webp',
        BMP: 'image/bmp'
    };
    var maxSteps = 4;
    var scaleFactor = Math.log(2);
    var supportMimeTypes = Object.keys(mimeTypes).map(function (type) { return mimeTypes[type]; });
    var defaultType = mimeTypes.JPEG;
    function isSupportedType(type) {
        return supportMimeTypes.includes(type);
    }
    var Compress = /** @class */ (function () {
        function Compress(file, config) {
            this.file = file;
            this.config = config;
            this.config = __assign$5({ quality: 0.92, noCompressIfLarger: false }, this.config);
        }
        Compress.prototype.process = function () {
            return __awaiter$5(this, void 0, void 0, function () {
                var srcDimension, originImage, canvas, scale, scaleCanvas, distBlob;
                return __generator$5(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.outputType = this.file.type;
                            srcDimension = {};
                            if (!isSupportedType(this.file.type)) {
                                throw new Error("unsupported file type: " + this.file.type);
                            }
                            return [4 /*yield*/, this.getOriginImage()];
                        case 1:
                            originImage = _a.sent();
                            return [4 /*yield*/, this.getCanvas(originImage)];
                        case 2:
                            canvas = _a.sent();
                            scale = 1;
                            if (this.config.maxWidth) {
                                scale = Math.min(1, this.config.maxWidth / canvas.width);
                            }
                            if (this.config.maxHeight) {
                                scale = Math.min(1, scale, this.config.maxHeight / canvas.height);
                            }
                            srcDimension.width = canvas.width;
                            srcDimension.height = canvas.height;
                            return [4 /*yield*/, this.doScale(canvas, scale)];
                        case 3:
                            scaleCanvas = _a.sent();
                            distBlob = this.toBlob(scaleCanvas);
                            if (distBlob.size > this.file.size && this.config.noCompressIfLarger) {
                                return [2 /*return*/, {
                                        dist: this.file,
                                        width: srcDimension.width,
                                        height: srcDimension.height
                                    }];
                            }
                            return [2 /*return*/, {
                                    dist: distBlob,
                                    width: scaleCanvas.width,
                                    height: scaleCanvas.height
                                }];
                    }
                });
            });
        };
        Compress.prototype.clear = function (ctx, width, height) {
            // jpeg 没有 alpha 通道，透明区间会被填充成黑色，这里把透明区间填充为白色
            if (this.outputType === defaultType) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, width, height);
            }
            else {
                ctx.clearRect(0, 0, width, height);
            }
        };
        /** 通过 file 初始化 image 对象 */
        Compress.prototype.getOriginImage = function () {
            var _this = this;
            return new Promise(function (resolve, reject) {
                var url = createObjectURL(_this.file);
                var img = new Image();
                img.onload = function () {
                    resolve(img);
                };
                img.onerror = function () {
                    reject('image load error');
                };
                img.src = url;
            });
        };
        Compress.prototype.getCanvas = function (img) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                // 通过得到图片的信息来调整显示方向以正确显示图片，主要解决 ios 系统上的图片会有旋转的问题
                exif_1.getData(img, function () {
                    var orientation = exif_1.getTag(img, 'Orientation') || 1;
                    var _a = getTransform(img, orientation), width = _a.width, height = _a.height, matrix = _a.matrix;
                    var canvas = document.createElement('canvas');
                    var context = canvas.getContext('2d');
                    canvas.width = width;
                    canvas.height = height;
                    if (!context) {
                        reject(new Error('context is null'));
                        return;
                    }
                    _this.clear(context, width, height);
                    context.transform.apply(context, __spread(matrix));
                    context.drawImage(img, 0, 0);
                    resolve(canvas);
                });
            });
        };
        Compress.prototype.doScale = function (source, scale) {
            return __awaiter$5(this, void 0, void 0, function () {
                var sctx, steps, factor, mirror, mctx, width, height, originWidth, originHeight, src, context, i, dw, dh, canvas, data;
                return __generator$5(this, function (_a) {
                    if (scale === 1) {
                        return [2 /*return*/, source];
                    }
                    sctx = source.getContext('2d');
                    steps = Math.min(maxSteps, Math.ceil((1 / scale) / scaleFactor));
                    factor = Math.pow(scale, (1 / steps));
                    mirror = document.createElement('canvas');
                    mctx = mirror.getContext('2d');
                    width = source.width, height = source.height;
                    originWidth = width;
                    originHeight = height;
                    mirror.width = width;
                    mirror.height = height;
                    if (!mctx || !sctx) {
                        throw new Error("mctx or sctx can't be null");
                    }
                    for (i = 0; i < steps; i++) {
                        dw = width * factor | 0 // eslint-disable-line no-bitwise
                        ;
                        dh = height * factor | 0 // eslint-disable-line no-bitwise
                        ;
                        // 到最后一步的时候 dw, dh 用目标缩放尺寸，否则会出现最后尺寸偏小的情况
                        if (i === steps - 1) {
                            dw = originWidth * scale;
                            dh = originHeight * scale;
                        }
                        if (i % 2 === 0) {
                            src = source;
                            context = mctx;
                        }
                        else {
                            src = mirror;
                            context = sctx;
                        }
                        // 每次画前都清空，避免图像重叠
                        this.clear(context, width, height);
                        context.drawImage(src, 0, 0, width, height, 0, 0, dw, dh);
                        width = dw;
                        height = dh;
                    }
                    canvas = src === source ? mirror : source;
                    data = context.getImageData(0, 0, width, height);
                    // resize
                    canvas.width = width;
                    canvas.height = height;
                    // store image data
                    context.putImageData(data, 0, 0);
                    return [2 /*return*/, canvas];
                });
            });
        };
        /** 这里把 base64 字符串转为 blob 对象 */
        Compress.prototype.toBlob = function (result) {
            var dataURL = result.toDataURL(this.outputType, this.config.quality);
            var buffer = atob(dataURL.split(',')[1]).split('').map(function (char) { return char.charCodeAt(0); });
            var blob = new Blob([new Uint8Array(buffer)], { type: this.outputType });
            return blob;
        };
        return Compress;
    }());
    var compressImage = function (file, options) { return new Compress(file, options).process(); };
    //# sourceMappingURL=compress.js.map

    function getImageUrl(key, domain) {
        key = encodeURIComponent(key);
        if (domain.slice(domain.length - 1) !== '/') {
            domain += '/';
        }
        return domain + key;
    }
    function imageView2(op, key, domain) {
        if (!/^\d$/.test(String(op.mode))) {
            throw 'mode should be number in imageView2';
        }
        var mode = op.mode, w = op.w, h = op.h, q = op.q, format = op.format;
        if (!w && !h) {
            throw 'param w and h is empty in imageView2';
        }
        var imageUrl = 'imageView2/' + encodeURIComponent(mode);
        imageUrl += w ? '/w/' + encodeURIComponent(w) : '';
        imageUrl += h ? '/h/' + encodeURIComponent(h) : '';
        imageUrl += q ? '/q/' + encodeURIComponent(q) : '';
        imageUrl += format ? '/format/' + encodeURIComponent(format) : '';
        if (key && domain) {
            imageUrl = getImageUrl(key, domain) + '?' + imageUrl;
        }
        return imageUrl;
    }
    // invoke the imageMogr2 api of Qiniu
    function imageMogr2(op, key, domain) {
        var autoOrient = op['auto-orient'];
        var thumbnail = op.thumbnail, strip = op.strip, gravity = op.gravity, crop = op.crop, quality = op.quality, rotate = op.rotate, format = op.format, blur = op.blur;
        var imageUrl = 'imageMogr2';
        imageUrl += autoOrient ? '/auto-orient' : '';
        imageUrl += thumbnail ? '/thumbnail/' + encodeURIComponent(thumbnail) : '';
        imageUrl += strip ? '/strip' : '';
        imageUrl += gravity ? '/gravity/' + encodeURIComponent(gravity) : '';
        imageUrl += quality ? '/quality/' + encodeURIComponent(quality) : '';
        imageUrl += crop ? '/crop/' + encodeURIComponent(crop) : '';
        imageUrl += rotate ? '/rotate/' + encodeURIComponent(rotate) : '';
        imageUrl += format ? '/format/' + encodeURIComponent(format) : '';
        imageUrl += blur ? '/blur/' + encodeURIComponent(blur) : '';
        if (key && domain) {
            imageUrl = getImageUrl(key, domain) + '?' + imageUrl;
        }
        return imageUrl;
    }
    // invoke the watermark api of Qiniu
    function watermark(op, key, domain) {
        var mode = op.mode;
        if (!mode) {
            throw "mode can't be empty in watermark";
        }
        var imageUrl = 'watermark/' + mode;
        if (mode !== 1 && mode !== 2) {
            throw 'mode is wrong';
        }
        if (mode === 1) {
            var image = op.image;
            if (!image) {
                throw "image can't be empty in watermark";
            }
            imageUrl += image ? '/image/' + urlSafeBase64Encode(image) : '';
        }
        if (mode === 2) {
            var text = op.text, font = op.font, fontsize = op.fontsize, fill = op.fill;
            if (!text) {
                throw "text can't be empty in watermark";
            }
            imageUrl += text ? '/text/' + urlSafeBase64Encode(text) : '';
            imageUrl += font ? '/font/' + urlSafeBase64Encode(font) : '';
            imageUrl += fontsize ? '/fontsize/' + fontsize : '';
            imageUrl += fill ? '/fill/' + urlSafeBase64Encode(fill) : '';
        }
        var dissolve = op.dissolve, gravity = op.gravity, dx = op.dx, dy = op.dy;
        imageUrl += dissolve ? '/dissolve/' + encodeURIComponent(dissolve) : '';
        imageUrl += gravity ? '/gravity/' + encodeURIComponent(gravity) : '';
        imageUrl += dx ? '/dx/' + encodeURIComponent(dx) : '';
        imageUrl += dy ? '/dy/' + encodeURIComponent(dy) : '';
        if (key && domain) {
            imageUrl = getImageUrl(key, domain) + '?' + imageUrl;
        }
        return imageUrl;
    }
    // invoke the imageInfo api of Qiniu
    function imageInfo(key, domain) {
        var url = getImageUrl(key, domain) + '?imageInfo';
        return request(url, { method: 'GET' });
    }
    // invoke the exif api of Qiniu
    function exif$1(key, domain) {
        var url = getImageUrl(key, domain) + '?exif';
        return request(url, { method: 'GET' });
    }
    function pipeline(arr, key, domain) {
        var isArray = Object.prototype.toString.call(arr) === '[object Array]';
        var option;
        var errOp = false;
        var imageUrl = '';
        if (isArray) {
            for (var i = 0, len = arr.length; i < len; i++) {
                option = arr[i];
                if (!option.fop) {
                    throw "fop can't be empty in pipeline";
                }
                switch (option.fop) {
                    case 'watermark':
                        imageUrl += watermark(option) + '|';
                        break;
                    case 'imageView2':
                        imageUrl += imageView2(option) + '|';
                        break;
                    case 'imageMogr2':
                        imageUrl += imageMogr2(option) + '|';
                        break;
                    default:
                        errOp = true;
                        break;
                }
                if (errOp) {
                    throw 'fop is wrong in pipeline';
                }
            }
            if (key && domain) {
                imageUrl = getImageUrl(key, domain) + '?' + imageUrl;
                var length_1 = imageUrl.length;
                if (imageUrl.slice(length_1 - 1) === '|') {
                    imageUrl = imageUrl.slice(0, length_1 - 1);
                }
            }
            return imageUrl;
        }
        throw "pipeline's first param should be array";
    }
    //# sourceMappingURL=image.js.map

    var statisticsLogger = new StatisticsLogger();
    /**
     * @param file 上传文件
     * @param key 目标文件名
     * @param token 上传凭证
     * @param putExtra 上传文件的相关资源信息配置
     * @param config 上传任务的配置
     * @returns 返回用于上传任务的可观察对象
     */
    function upload(file, key, token, putExtra, config) {
        var options = {
            file: file,
            key: key,
            token: token,
            putExtra: putExtra,
            config: config
        };
        return new Observable(function (observer) {
            var manager = createUploadManager(options, {
                onData: function (data) { return observer.next(data); },
                onError: function (err) { return observer.error(err); },
                onComplete: function (res) { return observer.complete(res); }
            }, statisticsLogger);
            manager.putFile();
            return manager.stop.bind(manager);
        });
    }
    //# sourceMappingURL=index.js.map

    var qiniu = /*#__PURE__*/Object.freeze({
        __proto__: null,
        upload: upload,
        compressImage: compressImage,
        getHeadersForMkFile: getHeadersForMkFile,
        getHeadersForChunkUpload: getHeadersForChunkUpload,
        urlSafeBase64Encode: urlSafeBase64Encode,
        urlSafeBase64Decode: urlSafeBase64Decode,
        deleteUploadedChunks: deleteUploadedChunks,
        getUploadUrl: getUploadUrl,
        imageMogr2: imageMogr2,
        watermark: watermark,
        imageInfo: imageInfo,
        exif: exif$1,
        pipeline: pipeline,
        region: region
    });

    /* src\components\ProgressLine.svelte generated by Svelte v3.32.3 */

    const file$2 = "src\\components\\ProgressLine.svelte";

    function create_fragment$2(ctx) {
    	let div5;
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			t2 = space();
    			div3 = element("div");
    			set_style(div0, "width", /*dotSize*/ ctx[0] + "px");
    			set_style(div0, "height", /*dotSize*/ ctx[0] + "px");
    			set_style(div0, "left", /*leftSize*/ ctx[1] + "px");
    			attr_dev(div0, "class", "svelte-17w1k0l");
    			add_location(div0, file$2, 11, 8, 301);
    			set_style(div1, "width", /*dotSize*/ ctx[0] + "px");
    			set_style(div1, "height", /*dotSize*/ ctx[0] + "px");
    			set_style(div1, "left", /*leftSize*/ ctx[1] + "px");
    			attr_dev(div1, "class", "svelte-17w1k0l");
    			add_location(div1, file$2, 17, 8, 442);
    			set_style(div2, "width", /*dotSize*/ ctx[0] + "px");
    			set_style(div2, "height", /*dotSize*/ ctx[0] + "px");
    			set_style(div2, "left", /*leftSize*/ ctx[1] * 4 + "px");
    			attr_dev(div2, "class", "svelte-17w1k0l");
    			add_location(div2, file$2, 25, 8, 616);
    			set_style(div3, "width", /*dotSize*/ ctx[0] + "px");
    			set_style(div3, "height", /*dotSize*/ ctx[0] + "px");
    			set_style(div3, "left", /*leftSize*/ ctx[1] * 7 + "px");
    			attr_dev(div3, "class", "svelte-17w1k0l");
    			add_location(div3, file$2, 32, 8, 778);
    			attr_dev(div4, "class", "lds-ellipsis svelte-17w1k0l");
    			set_style(div4, "--t-size", /*leftSize*/ ctx[1] * 3 + "px");
    			set_style(div4, "--bg-color", /*bgColor*/ ctx[2]);
    			add_location(div4, file$2, 7, 4, 179);
    			attr_dev(div5, "class", "w-full flex items-center justify-center");
    			add_location(div5, file$2, 6, 0, 120);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*dotSize*/ 1) {
    				set_style(div0, "width", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div0, "height", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*leftSize*/ 2) {
    				set_style(div0, "left", /*leftSize*/ ctx[1] + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div1, "width", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div1, "height", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*leftSize*/ 2) {
    				set_style(div1, "left", /*leftSize*/ ctx[1] + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div2, "width", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div2, "height", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*leftSize*/ 2) {
    				set_style(div2, "left", /*leftSize*/ ctx[1] * 4 + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div3, "width", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*dotSize*/ 1) {
    				set_style(div3, "height", /*dotSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*leftSize*/ 2) {
    				set_style(div3, "left", /*leftSize*/ ctx[1] * 7 + "px");
    			}

    			if (dirty & /*leftSize*/ 2) {
    				set_style(div4, "--t-size", /*leftSize*/ ctx[1] * 3 + "px");
    			}

    			if (dirty & /*bgColor*/ 4) {
    				set_style(div4, "--bg-color", /*bgColor*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ProgressLine", slots, []);
    	let { dotSize = 13 } = $$props;
    	let { leftSize = 8 } = $$props;
    	let { bgColor = "#a0aec0" } = $$props;
    	const writable_props = ["dotSize", "leftSize", "bgColor"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProgressLine> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("dotSize" in $$props) $$invalidate(0, dotSize = $$props.dotSize);
    		if ("leftSize" in $$props) $$invalidate(1, leftSize = $$props.leftSize);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    	};

    	$$self.$capture_state = () => ({ dotSize, leftSize, bgColor });

    	$$self.$inject_state = $$props => {
    		if ("dotSize" in $$props) $$invalidate(0, dotSize = $$props.dotSize);
    		if ("leftSize" in $$props) $$invalidate(1, leftSize = $$props.leftSize);
    		if ("bgColor" in $$props) $$invalidate(2, bgColor = $$props.bgColor);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [dotSize, leftSize, bgColor];
    }

    class ProgressLine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { dotSize: 0, leftSize: 1, bgColor: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProgressLine",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get dotSize() {
    		throw new Error("<ProgressLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dotSize(value) {
    		throw new Error("<ProgressLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get leftSize() {
    		throw new Error("<ProgressLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftSize(value) {
    		throw new Error("<ProgressLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bgColor() {
    		throw new Error("<ProgressLine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bgColor(value) {
    		throw new Error("<ProgressLine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\QuillEditor.svelte generated by Svelte v3.32.3 */

    const { console: console_1$1 } = globals;
    const file$3 = "src\\components\\QuillEditor.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i].file;
    	child_ctx[39] = list[i].percent_completed;
    	child_ctx[40] = list[i].uploadInfo;
    	child_ctx[41] = list[i].timeStamp;
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i];
    	return child_ctx;
    }

    // (332:4) {#if showTip}
    function create_if_block_4(ctx) {
    	let div;
    	let each_value_1 = /*tagTips*/ ctx[6];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "rounded bg-gray-800 text-sm text-white w-auto absolute font-bold");
    			set_style(div, "top", /*tipTop*/ ctx[8] + /*tipHeight*/ ctx[9] + "px");
    			set_style(div, "left", /*tipLeft*/ ctx[7] + "px");
    			add_location(div, file$3, 333, 8, 11078);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*tagTips*/ 64) {
    				each_value_1 = /*tagTips*/ ctx[6];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*tipTop, tipHeight*/ 768) {
    				set_style(div, "top", /*tipTop*/ ctx[8] + /*tipHeight*/ ctx[9] + "px");
    			}

    			if (dirty[0] & /*tipLeft*/ 128) {
    				set_style(div, "left", /*tipLeft*/ ctx[7] + "px");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(332:4) {#if showTip}",
    		ctx
    	});

    	return block;
    }

    // (338:12) {#each tagTips as item}
    function create_each_block_1$2(ctx) {
    	let div;
    	let t0_value = /*item*/ ctx[44] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[23](/*item*/ ctx[44]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(div, "class", "hover:bg-gray-800 rounded-sm p-1");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$3, 338, 16, 11299);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(div, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*tagTips*/ 64 && t0_value !== (t0_value = /*item*/ ctx[44] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(338:12) {#each tagTips as item}",
    		ctx
    	});

    	return block;
    }

    // (369:16) {#if percent_completed < 100 && percent_completed > 0}
    function create_if_block_3(ctx) {
    	let div1;
    	let div0;
    	let t0_value = /*percent_completed*/ ctx[39] + "";
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = text("%");
    			attr_dev(div0, "class", "m-auto text-white");
    			add_location(div0, file$3, 372, 24, 12879);
    			attr_dev(div1, "class", " w-full  h-full box-border absolute top-0 bg-black  bg-opacity-25 focus:outline-none flex justify-around  items-center ");
    			add_location(div1, file$3, 369, 20, 12673);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*imageFiles*/ 4 && t0_value !== (t0_value = /*percent_completed*/ ctx[39] + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(369:16) {#if percent_completed < 100 && percent_completed > 0}",
    		ctx
    	});

    	return block;
    }

    // (386:16) {#if percent_completed == 100}
    function create_if_block_2(ctx) {
    	let lable;
    	let div;
    	let i;

    	const block = {
    		c: function create() {
    			lable = element("lable");
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "ri-check-line text-white");
    			add_location(i, file$3, 402, 28, 14036);
    			attr_dev(div, "for", "");
    			set_style(div, "transform", "rotate(-45deg)");
    			set_style(div, "margin-top", "2px");
    			add_location(div, file$3, 398, 24, 13856);
    			attr_dev(lable, "class", "block");
    			set_style(lable, "position", "absolute");
    			set_style(lable, "right", "-15px");
    			set_style(lable, "top", "-6px");
    			set_style(lable, "width", "40px");
    			set_style(lable, "height", "24px");
    			set_style(lable, "background", "#13ce66");
    			set_style(lable, "text-align", "center");
    			set_style(lable, "transform", "rotate(45deg)");
    			set_style(lable, "box-shadow", "0 0 1pc 1px rgb(0 0 0 / 20%)");
    			add_location(lable, file$3, 386, 20, 13396);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, lable, anchor);
    			append_dev(lable, div);
    			append_dev(div, i);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(lable);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(386:16) {#if percent_completed == 100}",
    		ctx
    	});

    	return block;
    }

    // (353:8) {#each imageFiles as { file, percent_completed, uploadInfo, timeStamp }}
    function create_each_block$2(ctx) {
    	let div1;
    	let div0;
    	let button0;
    	let i0;
    	let t0;
    	let button1;
    	let i1;
    	let t1;
    	let t2;
    	let img;
    	let img_src_value;
    	let t3;
    	let t4;
    	let div1_intro;
    	let div1_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*percent_completed*/ ctx[39] < 100 && /*percent_completed*/ ctx[39] > 0 && create_if_block_3(ctx);
    	let if_block1 = /*percent_completed*/ ctx[39] == 100 && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t0 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			img = element("img");
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			attr_dev(i0, "class", "m-auto ri-zoom-in-line ri-xl text-white");
    			add_location(i0, file$3, 362, 24, 12284);
    			add_location(button0, file$3, 361, 20, 12229);
    			attr_dev(i1, "class", "m-auto ri-delete-bin-line ri-xl text-white");
    			add_location(i1, file$3, 365, 24, 12468);
    			attr_dev(button1, "class", " ");
    			add_location(button1, file$3, 364, 20, 12390);
    			attr_dev(div0, "class", " w-16 h-16  box-border absolute top-0 opacity-0 bg-black hover:opacity-75 focus:outline-none flex justify-around  ");
    			add_location(div0, file$3, 358, 16, 12040);
    			attr_dev(img, "class", " w-full h-full object-cover");

    			if (img.src !== (img_src_value = /*file*/ ctx[38] == null
    			? /*uploadInfo*/ ctx[40].domain + "/" + /*uploadInfo*/ ctx[40].key
    			: getObjectURL(/*file*/ ctx[38]))) attr_dev(img, "src", img_src_value);

    			attr_dev(img, "alt", "");
    			add_location(img, file$3, 378, 16, 13063);
    			attr_dev(div1, "class", "w-16 h-16 box-border  border-2 rounded mr-2 mb-2 relative overflow-hidden");
    			add_location(div1, file$3, 353, 12, 11779);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div0, t0);
    			append_dev(div0, button1);
    			append_dev(button1, i1);
    			append_dev(div1, t1);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div1, t2);
    			append_dev(div1, img);
    			append_dev(div1, t3);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", viewImage, false, false, false),
    					listen_dev(
    						button1,
    						"click",
    						function () {
    							if (is_function(/*deleteImage*/ ctx[15](/*timeStamp*/ ctx[41]))) /*deleteImage*/ ctx[15](/*timeStamp*/ ctx[41]).apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*percent_completed*/ ctx[39] < 100 && /*percent_completed*/ ctx[39] > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div1, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!current || dirty[0] & /*imageFiles*/ 4 && img.src !== (img_src_value = /*file*/ ctx[38] == null
    			? /*uploadInfo*/ ctx[40].domain + "/" + /*uploadInfo*/ ctx[40].key
    			: getObjectURL(/*file*/ ctx[38]))) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (/*percent_completed*/ ctx[39] == 100) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(div1, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, fly, { y: -100, duration: 500, easing: cubicOut });
    				div1_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div1_intro) div1_intro.invalidate();
    			div1_outro = create_out_transition(div1, fly, { y: -100, duration: 300 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (detaching && div1_outro) div1_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(353:8) {#each imageFiles as { file, percent_completed, uploadInfo, timeStamp }}",
    		ctx
    	});

    	return block;
    }

    // (454:12) {#if canCancle}
    function create_if_block_1$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "取消";
    			attr_dev(button, "class", "rounded-sm bg-white border-black text-black pl-2 pr-2 text-sm  focus:outline-none hover:shadow-sm");
    			add_location(button, file$3, 454, 16, 16059);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*cancelInput*/ ctx[13], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(454:12) {#if canCancle}",
    		ctx
    	});

    	return block;
    }

    // (469:16) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("发送");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(469:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (467:16) {#if isSending}
    function create_if_block$2(ctx) {
    	let progressline;
    	let current;

    	progressline = new ProgressLine({
    			props: {
    				dotSize: 5,
    				leftSize: 6,
    				bgColor: "white"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(progressline.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(progressline, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(progressline.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progressline.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(progressline, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(467:16) {#if isSending}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div5;
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let t2;
    	let div4;
    	let div2;
    	let button0;
    	let i0;
    	let t3;
    	let button1;
    	let i1;
    	let t4;
    	let button2;
    	let i2;
    	let t5;
    	let button3;
    	let i3;
    	let t6;
    	let button4;
    	let i4;
    	let t7;
    	let button5;
    	let i5;
    	let t8;
    	let input;
    	let t9;
    	let div3;
    	let t10;
    	let button6;
    	let current_block_type_index;
    	let if_block2;
    	let button6_disabled_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showTip*/ ctx[5] && create_if_block_4(ctx);
    	let each_value = /*imageFiles*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block1 = /*canCancle*/ ctx[0] && create_if_block_1$1(ctx);
    	const if_block_creators = [create_if_block$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isSending*/ ctx[12]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div4 = element("div");
    			div2 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t3 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t4 = space();
    			button2 = element("button");
    			i2 = element("i");
    			t5 = space();
    			button3 = element("button");
    			i3 = element("i");
    			t6 = space();
    			button4 = element("button");
    			i4 = element("i");
    			t7 = space();
    			button5 = element("button");
    			i5 = element("i");
    			t8 = space();
    			input = element("input");
    			t9 = space();
    			div3 = element("div");
    			if (if_block1) if_block1.c();
    			t10 = space();
    			button6 = element("button");
    			if_block2.c();
    			attr_dev(div0, "id", "editor");
    			attr_dev(div0, "class", "list-decimal list-inside");
    			add_location(div0, file$3, 330, 4, 10947);
    			attr_dev(div1, "class", "flex flex-wrap flex-row  mt-4  pl-3");
    			add_location(div1, file$3, 351, 4, 11634);
    			attr_dev(i0, "class", "ri-hashtag");
    			add_location(i0, file$3, 413, 41, 14467);
    			attr_dev(button0, "class", "rounded-sm hover:bg-gray-200 p-1 focus:outline-none");
    			add_location(button0, file$3, 411, 12, 14340);
    			attr_dev(i1, "class", "ri-bold");
    			add_location(i1, file$3, 416, 17, 14611);
    			attr_dev(button1, "class", "ql-bold hover:bg-gray-200 p-1 focus:outline-none");
    			add_location(button1, file$3, 415, 12, 14528);
    			attr_dev(i2, "class", "ri-list-check hover:bg-gray-200 p-1 focus:outline-none");
    			add_location(i2, file$3, 421, 17, 14801);
    			attr_dev(button2, "class", "ql-list hover:bg-gray-200 p-1 focus:outline-none");
    			button2.value = "bullet";
    			add_location(button2, file$3, 418, 12, 14669);
    			attr_dev(i3, "class", "ri-list-ordered  hover:bg-gray-200 p-1 focus:outline-none");
    			add_location(i3, file$3, 429, 17, 15079);
    			attr_dev(button3, "class", "ql-list hover:bg-gray-200 p-1 focus:outline-none");
    			button3.value = "ordered";
    			add_location(button3, file$3, 426, 12, 14946);
    			attr_dev(i4, "class", "ri-underline");
    			add_location(i4, file$3, 436, 17, 15332);
    			attr_dev(button4, "class", "ql-underline hover:bg-gray-200 p-1 focus:outline-none");
    			add_location(button4, file$3, 434, 12, 15227);
    			attr_dev(i5, "class", "ri-image-2-line ");
    			add_location(i5, file$3, 440, 40, 15522);
    			attr_dev(button5, "class", "rounded-sm hover:bg-gray-200 p-1 focus:outline-none ");
    			add_location(button5, file$3, 438, 12, 15395);
    			attr_dev(input, "class", "w-full  rounded-lg   p-2 bg-blue-400 text-white focus:outline-none");
    			attr_dev(input, "type", "file");
    			set_style(input, "display", "none");
    			attr_dev(input, "accept", "image/png, image/jpeg, image/gif, image/jpg");
    			input.multiple = true;
    			add_location(input, file$3, 442, 12, 15589);
    			attr_dev(div2, "id", "toolbar");
    			attr_dev(div2, "class", "space-x-2");
    			add_location(div2, file$3, 410, 8, 14270);
    			attr_dev(button6, "class", "rounded-sm bg-green-500 text-white pl-2 pr-2 text-sm  focus:outline-none disabled:opacity-50 fle justify-center items-center w-16");
    			button6.disabled = button6_disabled_value = /*isContentEmpty*/ ctx[11] || /*isSending*/ ctx[12];
    			add_location(button6, file$3, 459, 12, 16300);
    			attr_dev(div3, "class", "flex space-x-2");
    			add_location(div3, file$3, 452, 8, 15984);
    			attr_dev(div4, "class", " flex justify-between  pl-3 pr-3");
    			add_location(div4, file$3, 409, 4, 14214);
    			attr_dev(div5, "class", "border-gray-200 border-solid border-4 rounded-lg mt-2 flex flex-col justify-start  pb-2 bg-white relative");
    			add_location(div5, file$3, 327, 0, 10815);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			/*div0_binding*/ ctx[22](div0);
    			append_dev(div5, t0);
    			if (if_block0) if_block0.m(div5, null);
    			append_dev(div5, t1);
    			append_dev(div5, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div5, t2);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, button0);
    			append_dev(button0, i0);
    			append_dev(div2, t3);
    			append_dev(div2, button1);
    			append_dev(button1, i1);
    			append_dev(div2, t4);
    			append_dev(div2, button2);
    			append_dev(button2, i2);
    			append_dev(div2, t5);
    			append_dev(div2, button3);
    			append_dev(button3, i3);
    			append_dev(div2, t6);
    			append_dev(div2, button4);
    			append_dev(button4, i4);
    			append_dev(div2, t7);
    			append_dev(div2, button5);
    			append_dev(button5, i5);
    			append_dev(div2, t8);
    			append_dev(div2, input);
    			/*input_binding*/ ctx[24](input);
    			/*div2_binding*/ ctx[26](div2);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			if (if_block1) if_block1.m(div3, null);
    			append_dev(div3, t10);
    			append_dev(div3, button6);
    			if_blocks[current_block_type_index].m(button6, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*insertHashTag*/ ctx[16], false, false, false),
    					listen_dev(button5, "click", /*selectImages*/ ctx[14], false, false, false),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[25]),
    					listen_dev(button6, "click", /*click_handler_1*/ ctx[27], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*showTip*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div5, t1);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty[0] & /*imageFiles, deleteImage*/ 32772) {
    				each_value = /*imageFiles*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*canCancle*/ ctx[0]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(div3, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block2 = if_blocks[current_block_type_index];

    				if (!if_block2) {
    					if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block2.c();
    				}

    				transition_in(if_block2, 1);
    				if_block2.m(button6, null);
    			}

    			if (!current || dirty[0] & /*isContentEmpty, isSending*/ 6144 && button6_disabled_value !== (button6_disabled_value = /*isContentEmpty*/ ctx[11] || /*isSending*/ ctx[12])) {
    				prop_dev(button6, "disabled", button6_disabled_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			/*div0_binding*/ ctx[22](null);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			/*input_binding*/ ctx[24](null);
    			/*div2_binding*/ ctx[26](null);
    			if (if_block1) if_block1.d();
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function tipTagInsert(tag) {
    	quill.updateContents(new Delta().retain(6).delete(5).insert("Quill")); // Keep 'Hello '
    	// 'World' is deleted
    	// Apply bold to exclamation mark
    }

    function viewImage(params) {
    	
    }

    function getObjectURL(file) {
    	var url = null;

    	// 下面函数执行的效果是一样的，只是需要针对不同的浏览器执行不同的 js 函数而已
    	if (window.createObjectURL != undefined) {
    		// basic
    		url = window.createObjectURL(file);
    	} else if (window.URL != undefined) {
    		// mozilla(firefox)
    		url = window.URL.createObjectURL(file);
    	} else if (window.webkitURL != undefined) {
    		// webkit or chrome
    		url = window.webkitURL.createObjectURL(file);
    	}

    	return url;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $tagStrore;
    	let $settingStrore;
    	validate_store(tagStrore, "tagStrore");
    	component_subscribe($$self, tagStrore, $$value => $$invalidate(31, $tagStrore = $$value));
    	validate_store(settingStrore, "settingStrore");
    	component_subscribe($$self, settingStrore, $$value => $$invalidate(32, $settingStrore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("QuillEditor", slots, []);
    	let { content = "" } = $$props;
    	let { _id = "" } = $$props;
    	let { parentId = "" } = $$props;
    	let { images = [] } = $$props;
    	let { canCancle = false } = $$props;
    	const dispatch = createEventDispatcher();
    	let editor = "";
    	let toolbar = "";
    	let quillEditor;
    	let showTip = false;
    	let tagStartIndex = 0;
    	let selectionIndex = 0;
    	let tagTips = [];
    	let tipLeft = 0;
    	let tipTop = 0;
    	let tipHeight = 0;
    	let uploadimageNode = "";
    	let uploadimagefiles = [];
    	let imageFiles = [];
    	let isContentEmpty = true;
    	let isSending = false;

    	onMount(() => {
    		var options = {
    			// debug: "info",
    			modules: { toolbar },
    			placeholder: "现在的想法是..."
    		};

    		quillEditor = new Quill(editor, options);
    		const delta = quillEditor.clipboard.convert(content);
    		quillEditor.setContents(delta, "silent");
    		quillEditor.focus();

    		if (content.length != 0) {
    			$$invalidate(11, isContentEmpty = false);
    		}

    		quillEditor.on("text-change", function (delta, oldDelta, source) {
    			$$invalidate(11, isContentEmpty = quillEditor.getText().length == 1);
    			console.log(delta);

    			if (delta.ops.length > 1 && delta.ops[1].insert == "\n") {
    				$$invalidate(6, tagTips = []);
    				$$invalidate(5, showTip = false);
    			} else {
    				toolTip();
    			}
    		});

    		quillEditor.on("selection-change", function (range, oldRange, source) {
    			if (range) {
    				console.log(range);
    				toolTip();
    			} else {
    				console.log("Cursor not in the editor");
    			}
    		});

    		quillEditor.setSelection(quillEditor.getText().length);
    		let tempfiles = [];

    		images.forEach(element => {
    			tempfiles = [
    				...tempfiles,
    				{
    					file: null,
    					percent_completed: 100,
    					uploadInfo: element,
    					timeStamp: Date.now() + Math.random(),
    					uploadingstatus: "已上传", //"上传中","已上传"
    					
    				}
    			];
    		});

    		$$invalidate(2, imageFiles = tempfiles);
    	});

    	function toolTip() {
    		let selection = quillEditor.getSelection();
    		let cIndex = selection.index;
    		var text = quillEditor.getText();
    		let sIndex = text.lastIndexOf("#", cIndex);

    		if (sIndex != -1) {
    			let tagMay = text.substring(sIndex, cIndex);
    			$$invalidate(6, tagTips = []);

    			for (let index = 0; index < $tagStrore.allTags.length; index++) {
    				const element = $tagStrore.allTags[index];

    				if (element.indexOf(tagMay) == 0) {
    					$$invalidate(6, tagTips = [...tagTips, element]);
    				}
    			}

    			if (tagTips.length != 0) {
    				let getBounds = quillEditor.getBounds(sIndex);
    				selectionIndex = cIndex;
    				tagStartIndex = sIndex;
    				$$invalidate(5, showTip = true);
    				$$invalidate(7, tipLeft = getBounds.left);
    				$$invalidate(8, tipTop = getBounds.top);
    				$$invalidate(9, tipHeight = getBounds.height);
    			}
    		} else {
    			$$invalidate(5, showTip = false);
    		}
    	}

    	function joinFile(uploadimagefiles) {
    		let filelist = Array.from(uploadimagefiles);
    		let tempfiles = imageFiles;

    		filelist.forEach(element => {
    			tempfiles = [
    				...tempfiles,
    				{
    					file: element,
    					percent_completed: 0,
    					uploadInfo: { platform: "", url: "", key: "" },
    					timeStamp: Date.now() + Math.random(),
    					uploadingstatus: "未上传", //"上传中","已上传"
    					
    				}
    			];
    		});

    		return tempfiles;
    	}

    	function cancelInput() {
    		$$invalidate(2, imageFiles = []);
    		dispatch("cancle", {});
    	}

    	function selectImages(params) {
    		uploadimageNode.click();
    	}

    	function deleteImage(timeStamp) {
    		$$invalidate(2, imageFiles = imageFiles.filter(item => {
    			return item.timeStamp != timeStamp;
    		}));
    	}

    	function insertHashTag() {
    		var range = quillEditor.getSelection(true);
    		let index = 0;

    		if (range) {
    			if (range.length == 0) {
    				index = range.index;
    			} else {
    				index = range.index + range.length;
    			}
    		}

    		quillEditor.insertText(index, "#");
    	}

    	function uploadPicQiniu(imageFile, index, token) {
    		console.log(imageFile, imageFile.name, token);
    		const observable = upload(imageFile.file, imageFile.file.name, token);

    		const subscription = observable.subscribe(
    			response => {
    				let total = response.total;
    				$$invalidate(2, imageFiles[index].percent_completed = parseInt(total.percent + ""), imageFiles);
    				console.log(response, total);
    			},
    			error => {
    				console.log(error, "错误");
    			},
    			response => {
    				console.log(response, "已上传");
    				$$invalidate(2, imageFiles[index].uploadingstatus = "已上传", imageFiles);
    				$$invalidate(2, imageFiles[index].uploadInfo.key = response.key, imageFiles);
    				$$invalidate(2, imageFiles[index].uploadInfo.platform = "qiniu", imageFiles);
    			}
    		); // 这样传参形式也可以
    	}

    	function uploadPic(imageFile, index) {
    		var formData = new FormData();
    		var fileField = imageFile.file;
    		formData.append("file", fileField);
    		let request = new XMLHttpRequest();
    		request.open("POST", "http://127.0.0.1:8888/cat/uploadPic");

    		// upload progress event
    		request.upload.addEventListener("progress", function (e) {
    			// upload progress as percentage
    			let percent_completed = e.loaded / e.total * 100;

    			$$invalidate(2, imageFiles[index].percent_completed = parseInt(percent_completed + ""), imageFiles);

    			if (percent_completed >= 100) {
    				$$invalidate(2, imageFiles[index].uploadingstatus = "已上传", imageFiles);
    			}

    			console.log(percent_completed, index, imageFiles[index].percent_completed);
    		});

    		// request finished event
    		request.addEventListener("load", function (e) {
    			// HTTP status message (200, 404 etc)
    			console.log(request.status);

    			// request.response holds response from the server
    			console.log(request.response);
    		});

    		// send POST request to server
    		request.send(formData);
    	}

    	function sendBiu() {
    		let sContent = editor.childNodes[0].innerHTML;
    		$$invalidate(12, isSending = true);
    		let cc = quillEditor.getContents();
    		let tags = [];

    		for (let index = 0; index < cc.ops.length; index++) {
    			let item = cc.ops[index];
    			let mt = item.insert.match(/#\S*/g);

    			if (mt != null) {
    				tags = [...tags, ...mt];
    			}
    		}

    		let imagesInfo = [];

    		for (let index = 0; index < imageFiles.length; index++) {
    			const element = imageFiles[index];

    			if (element.uploadingstatus != "已上传") {
    				return;
    			}

    			imagesInfo = [
    				...imagesInfo,
    				{
    					key: element.uploadInfo.key,
    					platform: $settingStrore.platform,
    					domain: $settingStrore.domain,
    					timeStamp: element.timeStamp
    				}
    			];
    		}

    		addFmolo({
    			content: sContent,
    			_id,
    			parentId,
    			source: "web",
    			tags,
    			images: imagesInfo
    		}).then(async respone => {
    			let re = await respone.json();
    			$$invalidate(12, isSending = false);

    			if (re.errorMessage == undefined) {
    				quillEditor.setContents([]);
    				dispatch("update", re.body);
    				cancelInput();
    			}
    		}).catch(reason => {
    			$$invalidate(12, isSending = false);
    			console.log(reason);
    		});
    	}

    	const writable_props = ["content", "_id", "parentId", "images", "canCancle"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<QuillEditor> was created with unknown prop '${key}'`);
    	});

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			editor = $$value;
    			$$invalidate(3, editor);
    		});
    	}

    	const click_handler = item => {
    		tipTagInsert();
    	};

    	function input_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			uploadimageNode = $$value;
    			$$invalidate(10, uploadimageNode);
    		});
    	}

    	function input_change_handler() {
    		uploadimagefiles = this.files;
    		$$invalidate(1, uploadimagefiles);
    	}

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			toolbar = $$value;
    			$$invalidate(4, toolbar);
    		});
    	}

    	const click_handler_1 = () => {
    		sendBiu();
    	};

    	$$self.$$set = $$props => {
    		if ("content" in $$props) $$invalidate(18, content = $$props.content);
    		if ("_id" in $$props) $$invalidate(19, _id = $$props._id);
    		if ("parentId" in $$props) $$invalidate(20, parentId = $$props.parentId);
    		if ("images" in $$props) $$invalidate(21, images = $$props.images);
    		if ("canCancle" in $$props) $$invalidate(0, canCancle = $$props.canCancle);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		fly,
    		cubicOut,
    		Quill,
    		qiniu,
    		addFmolo,
    		qiniuToken,
    		settingStrore,
    		tagStrore,
    		ProgressLine,
    		content,
    		_id,
    		parentId,
    		images,
    		canCancle,
    		dispatch,
    		editor,
    		toolbar,
    		quillEditor,
    		showTip,
    		tagStartIndex,
    		selectionIndex,
    		tagTips,
    		tipLeft,
    		tipTop,
    		tipHeight,
    		uploadimageNode,
    		uploadimagefiles,
    		imageFiles,
    		isContentEmpty,
    		isSending,
    		toolTip,
    		tipTagInsert,
    		joinFile,
    		cancelInput,
    		selectImages,
    		viewImage,
    		deleteImage,
    		insertHashTag,
    		getObjectURL,
    		uploadPicQiniu,
    		uploadPic,
    		sendBiu,
    		$tagStrore,
    		$settingStrore
    	});

    	$$self.$inject_state = $$props => {
    		if ("content" in $$props) $$invalidate(18, content = $$props.content);
    		if ("_id" in $$props) $$invalidate(19, _id = $$props._id);
    		if ("parentId" in $$props) $$invalidate(20, parentId = $$props.parentId);
    		if ("images" in $$props) $$invalidate(21, images = $$props.images);
    		if ("canCancle" in $$props) $$invalidate(0, canCancle = $$props.canCancle);
    		if ("editor" in $$props) $$invalidate(3, editor = $$props.editor);
    		if ("toolbar" in $$props) $$invalidate(4, toolbar = $$props.toolbar);
    		if ("quillEditor" in $$props) quillEditor = $$props.quillEditor;
    		if ("showTip" in $$props) $$invalidate(5, showTip = $$props.showTip);
    		if ("tagStartIndex" in $$props) tagStartIndex = $$props.tagStartIndex;
    		if ("selectionIndex" in $$props) selectionIndex = $$props.selectionIndex;
    		if ("tagTips" in $$props) $$invalidate(6, tagTips = $$props.tagTips);
    		if ("tipLeft" in $$props) $$invalidate(7, tipLeft = $$props.tipLeft);
    		if ("tipTop" in $$props) $$invalidate(8, tipTop = $$props.tipTop);
    		if ("tipHeight" in $$props) $$invalidate(9, tipHeight = $$props.tipHeight);
    		if ("uploadimageNode" in $$props) $$invalidate(10, uploadimageNode = $$props.uploadimageNode);
    		if ("uploadimagefiles" in $$props) $$invalidate(1, uploadimagefiles = $$props.uploadimagefiles);
    		if ("imageFiles" in $$props) $$invalidate(2, imageFiles = $$props.imageFiles);
    		if ("isContentEmpty" in $$props) $$invalidate(11, isContentEmpty = $$props.isContentEmpty);
    		if ("isSending" in $$props) $$invalidate(12, isSending = $$props.isSending);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*uploadimagefiles*/ 2) {
    			 $$invalidate(2, imageFiles = joinFile(uploadimagefiles));
    		}

    		if ($$self.$$.dirty[0] & /*imageFiles*/ 4) {
    			 {
    				for (let index = 0; index < imageFiles.length; index++) {
    					const element = imageFiles[index];

    					if (element.uploadingstatus == "未上传") {
    						element.uploadingstatus = "上传中";

    						// uploadPic(element, index);
    						qiniuToken().then(async respone => {
    							let re = await respone.json();

    							if (re.errorMessage == undefined) {
    								uploadPicQiniu(element, index, re.body);
    							}
    						}).catch(reason => {
    							console.log(reason);
    						});
    					}
    				}
    			}
    		}
    	};

    	return [
    		canCancle,
    		uploadimagefiles,
    		imageFiles,
    		editor,
    		toolbar,
    		showTip,
    		tagTips,
    		tipLeft,
    		tipTop,
    		tipHeight,
    		uploadimageNode,
    		isContentEmpty,
    		isSending,
    		cancelInput,
    		selectImages,
    		deleteImage,
    		insertHashTag,
    		sendBiu,
    		content,
    		_id,
    		parentId,
    		images,
    		div0_binding,
    		click_handler,
    		input_binding,
    		input_change_handler,
    		div2_binding,
    		click_handler_1
    	];
    }

    class QuillEditor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				content: 18,
    				_id: 19,
    				parentId: 20,
    				images: 21,
    				canCancle: 0
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QuillEditor",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get content() {
    		throw new Error("<QuillEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<QuillEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get _id() {
    		throw new Error("<QuillEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set _id(value) {
    		throw new Error("<QuillEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parentId() {
    		throw new Error("<QuillEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentId(value) {
    		throw new Error("<QuillEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get images() {
    		throw new Error("<QuillEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set images(value) {
    		throw new Error("<QuillEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get canCancle() {
    		throw new Error("<QuillEditor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set canCancle(value) {
    		throw new Error("<QuillEditor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\FmoloDetail.svelte generated by Svelte v3.32.3 */

    const { console: console_1$2 } = globals;
    const file$4 = "src\\components\\FmoloDetail.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (58:0) {#if show}
    function create_if_block$3(ctx) {
    	let div1;
    	let div0;
    	let t;
    	let div1_intro;
    	let div1_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showRight*/ ctx[2] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "lt:w-4/12 w-2/12 2xl:w-8/12 float-left   h-full ");
    			add_location(div0, file$4, 63, 8, 1752);
    			attr_dev(div1, "class", "w-screen bg-black bg-opacity-50 fixed top-0 z-20 h-screen ");
    			add_location(div1, file$4, 58, 4, 1580);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t);
    			if (if_block) if_block.m(div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*showRight*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*showRight*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, fade, { duration: 100 });
    				div1_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (div1_intro) div1_intro.invalidate();
    			div1_outro = create_out_transition(div1, fade, { duration: 100 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching && div1_outro) div1_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(58:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (70:8) {#if showRight}
    function create_if_block_1$2(ctx) {
    	let div2;
    	let t0;
    	let div0;
    	let button;
    	let i;
    	let t1;
    	let fmoloitem;
    	let t2;
    	let div1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t3;
    	let quilleditor;
    	let div2_intro;
    	let div2_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isLoding*/ ctx[0] && create_if_block_2$1(ctx);

    	fmoloitem = new FmoloItem({
    			props: {
    				_id: /*fmoloDetail*/ ctx[3]._id,
    				created_at: /*fmoloDetail*/ ctx[3].created_at,
    				content: /*fmoloDetail*/ ctx[3].content,
    				parentId: /*fmoloDetail*/ ctx[3].parentId,
    				parent: /*fmoloDetail*/ ctx[3].parent,
    				images: /*fmoloDetail*/ ctx[3].images
    			},
    			$$inline: true
    		});

    	let each_value = /*fmoloDetail*/ ctx[3].children;
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[12]._id;
    	validate_each_keys(ctx, each_value, get_each_context$3, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$3(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$3(key, child_ctx));
    	}

    	quilleditor = new QuillEditor({
    			props: { parentId: /*fmoloDetail*/ ctx[3]._id },
    			$$inline: true
    		});

    	quilleditor.$on("update", /*update_handler*/ ctx[8]);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			button = element("button");
    			i = element("i");
    			t1 = space();
    			create_component(fmoloitem.$$.fragment);
    			t2 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			create_component(quilleditor.$$.fragment);
    			attr_dev(i, "class", "ri-close-fill");
    			add_location(i, file$4, 88, 24, 2684);
    			attr_dev(button, "class", "focus:outline-none w-10 float-left");
    			add_location(button, file$4, 82, 20, 2450);
    			add_location(div0, file$4, 81, 16, 2423);
    			attr_dev(div1, "class", " pl-6 ");
    			add_location(div1, file$4, 101, 16, 3138);
    			attr_dev(div2, "class", "lt:w-8/12 w-10/12 2xl:w-4/12 float-right  shadow-sm bg-gray-100 h-full p-4 flex flex-col overflow-y-scroll");
    			add_location(div2, file$4, 70, 12, 1951);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			if (if_block) if_block.m(div2, null);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, button);
    			append_dev(button, i);
    			append_dev(div2, t1);
    			mount_component(fmoloitem, div2, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			append_dev(div2, t3);
    			mount_component(quilleditor, div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[6], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*isLoding*/ ctx[0]) {
    				if (if_block) {
    					if (dirty & /*isLoding*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div2, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const fmoloitem_changes = {};
    			if (dirty & /*fmoloDetail*/ 8) fmoloitem_changes._id = /*fmoloDetail*/ ctx[3]._id;
    			if (dirty & /*fmoloDetail*/ 8) fmoloitem_changes.created_at = /*fmoloDetail*/ ctx[3].created_at;
    			if (dirty & /*fmoloDetail*/ 8) fmoloitem_changes.content = /*fmoloDetail*/ ctx[3].content;
    			if (dirty & /*fmoloDetail*/ 8) fmoloitem_changes.parentId = /*fmoloDetail*/ ctx[3].parentId;
    			if (dirty & /*fmoloDetail*/ 8) fmoloitem_changes.parent = /*fmoloDetail*/ ctx[3].parent;
    			if (dirty & /*fmoloDetail*/ 8) fmoloitem_changes.images = /*fmoloDetail*/ ctx[3].images;
    			fmoloitem.$set(fmoloitem_changes);

    			if (dirty & /*fmoloDetail*/ 8) {
    				each_value = /*fmoloDetail*/ ctx[3].children;
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context$3, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, outro_and_destroy_block, create_each_block$3, null, get_each_context$3);
    				check_outros();
    			}

    			const quilleditor_changes = {};
    			if (dirty & /*fmoloDetail*/ 8) quilleditor_changes.parentId = /*fmoloDetail*/ ctx[3]._id;
    			quilleditor.$set(quilleditor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(fmoloitem.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(quilleditor.$$.fragment, local);

    			add_render_callback(() => {
    				if (div2_outro) div2_outro.end(1);
    				if (!div2_intro) div2_intro = create_in_transition(div2, fly, { x: 200, duration: 200 });
    				div2_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(fmoloitem.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(quilleditor.$$.fragment, local);
    			if (div2_intro) div2_intro.invalidate();
    			div2_outro = create_out_transition(div2, fly, { x: 200, duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    			destroy_component(fmoloitem);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			destroy_component(quilleditor);
    			if (detaching && div2_outro) div2_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(70:8) {#if showRight}",
    		ctx
    	});

    	return block;
    }

    // (76:16) {#if isLoding}
    function create_if_block_2$1(ctx) {
    	let div;
    	let progressline;
    	let div_transition;
    	let current;
    	progressline = new ProgressLine({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(progressline.$$.fragment);
    			add_location(div, file$4, 76, 20, 2261);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(progressline, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(progressline.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { y: -20, duration: 1000 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progressline.$$.fragment, local);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { y: -20, duration: 1000 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(progressline);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(76:16) {#if isLoding}",
    		ctx
    	});

    	return block;
    }

    // (103:20) {#each fmoloDetail.children as item (item._id)}
    function create_each_block$3(key_1, ctx) {
    	let first;
    	let fmoloitem;
    	let current;
    	const fmoloitem_spread_levels = [/*item*/ ctx[12]];
    	let fmoloitem_props = {};

    	for (let i = 0; i < fmoloitem_spread_levels.length; i += 1) {
    		fmoloitem_props = assign(fmoloitem_props, fmoloitem_spread_levels[i]);
    	}

    	fmoloitem = new FmoloItem({ props: fmoloitem_props, $$inline: true });
    	fmoloitem.$on("deleteOne", /*deleteOne_handler*/ ctx[7]);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(fmoloitem.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(fmoloitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			const fmoloitem_changes = (dirty & /*fmoloDetail*/ 8)
    			? get_spread_update(fmoloitem_spread_levels, [get_spread_object(/*item*/ ctx[12])])
    			: {};

    			fmoloitem.$set(fmoloitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fmoloitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fmoloitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(fmoloitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(103:20) {#each fmoloDetail.children as item (item._id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[1] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let showDetailss = null;

    function showFmolo(fmoloId, isHidden) {
    	console.log("showFmolo", fmoloId, isHidden);
    	showDetailss(fmoloId, isHidden);
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FmoloDetail", slots, []);
    	let isLoding = true;
    	let show = false;
    	let showRight = false;
    	let fmoloDetail = { children: [], _id: "" };

    	onMount(() => {
    		showDetailss = showDetail;
    	});

    	let _id = "";

    	function showDetail(newFmoloId) {
    		_id = newFmoloId;

    		if (show != true) {
    			$$invalidate(2, showRight = true);
    		}

    		$$invalidate(1, show = true);
    		getDetail(_id);
    	}

    	function getDetail(_id) {
    		$$invalidate(0, isLoding = true);

    		detail({ _id }).then(async respone => {
    			let re = await respone.json();
    			$$invalidate(3, fmoloDetail = re.body);
    			console.log(fmoloDetail);
    			$$invalidate(0, isLoding = false);
    		}).catch(reason => {
    			console.log(reason);
    			$$invalidate(0, isLoding = false);
    		});
    	}

    	function hidden(params) {
    		$$invalidate(0, isLoding = false);
    		$$invalidate(1, show = false);
    		$$invalidate(2, showRight = false);
    		$$invalidate(3, fmoloDetail = { children: [], _id: "" });
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<FmoloDetail> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		hidden();
    	};

    	const click_handler_1 = () => {
    		hidden();
    	};

    	const deleteOne_handler = event => {
    		$$invalidate(
    			3,
    			fmoloDetail.children = fmoloDetail.children.filter(item => {
    				return item._id != event.detail._id;
    			}),
    			fmoloDetail
    		);
    	};

    	const update_handler = event => {
    		$$invalidate(3, fmoloDetail.children = [...fmoloDetail.children, event.detail], fmoloDetail);
    	};

    	$$self.$capture_state = () => ({
    		showDetailss,
    		showFmolo,
    		fly,
    		fade,
    		QuillEditor,
    		FmoloItem,
    		ProgressLine,
    		detail,
    		onMount,
    		isLoding,
    		show,
    		showRight,
    		fmoloDetail,
    		_id,
    		showDetail,
    		getDetail,
    		hidden
    	});

    	$$self.$inject_state = $$props => {
    		if ("isLoding" in $$props) $$invalidate(0, isLoding = $$props.isLoding);
    		if ("show" in $$props) $$invalidate(1, show = $$props.show);
    		if ("showRight" in $$props) $$invalidate(2, showRight = $$props.showRight);
    		if ("fmoloDetail" in $$props) $$invalidate(3, fmoloDetail = $$props.fmoloDetail);
    		if ("_id" in $$props) _id = $$props._id;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		isLoding,
    		show,
    		showRight,
    		fmoloDetail,
    		hidden,
    		click_handler,
    		click_handler_1,
    		deleteOne_handler,
    		update_handler
    	];
    }

    class FmoloDetail extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FmoloDetail",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\FmoloItem.svelte generated by Svelte v3.32.3 */

    const { console: console_1$3 } = globals;
    const file$5 = "src\\components\\FmoloItem.svelte";

    function get_each_context$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i].domain;
    	child_ctx[32] = list[i].key;
    	child_ctx[34] = i;
    	return child_ctx;
    }

    // (103:12) {#if openMore == true}
    function create_if_block_2$2(ctx) {
    	let div;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let action_action;
    	let div_intro;
    	let div_outro;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			button0.textContent = "分享";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "编辑";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "批注";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "删除";
    			attr_dev(button0, "class", "focus:outline-none hover:bg-gray-300 ");
    			add_location(button0, file$5, 117, 20, 4097);
    			attr_dev(button1, "class", "focus:outline-none hover:bg-gray-300 ");
    			add_location(button1, file$5, 120, 20, 4232);
    			attr_dev(button2, "class", "focus:outline-none hover:bg-gray-300");
    			add_location(button2, file$5, 126, 20, 4484);
    			attr_dev(button3, "class", "focus:outline-none hover:bg-gray-300");
    			add_location(button3, file$5, 132, 20, 4740);
    			attr_dev(div, "tabindex", "0");
    			attr_dev(div, "class", " absolute w-16  bg-white shadow-xl rounded-lg flex flex-col justify-center  border-gray-200  border-solid space-y-1 pt-2 pb-2 focus:outline-none");
    			set_style(div, "left", "-16px");
    			set_style(div, "border-width", "1px");
    			add_location(div, file$5, 103, 16, 3415);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			append_dev(div, t3);
    			append_dev(div, button2);
    			append_dev(div, t5);
    			append_dev(div, button3);
    			/*div_binding*/ ctx[21](div);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[17], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[18], false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[19], false, false, false),
    					action_destroyer(action_action = action.call(null, div)),
    					listen_dev(div, "blur", stop_propagation(/*blur_handler*/ ctx[20]), false, false, true)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fade, { duration: 100 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fade, { duration: 100 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[21](null);
    			if (detaching && div_outro) div_outro.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(103:12) {#if openMore == true}",
    		ctx
    	});

    	return block;
    }

    // (159:4) {:else}
    function create_else_block$1(ctx) {
    	let div;
    	let p;
    	let raw_value = /*praseTag*/ ctx[14](/*content*/ ctx[0], /*tags*/ ctx[7]) + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			p = element("p");
    			add_location(p, file$5, 160, 12, 5571);
    			attr_dev(div, "class", "list-decimal text-sm text-red-300");
    			add_location(div, file$5, 159, 8, 5510);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p);
    			p.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*content, tags*/ 129 && raw_value !== (raw_value = /*praseTag*/ ctx[14](/*content*/ ctx[0], /*tags*/ ctx[7]) + "")) p.innerHTML = raw_value;		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(159:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (143:4) {#if editMode}
    function create_if_block_1$3(ctx) {
    	let quilleditor;
    	let current;

    	quilleditor = new QuillEditor({
    			props: {
    				content: /*content*/ ctx[0],
    				images: /*images*/ ctx[1],
    				_id: /*_id*/ ctx[2],
    				parentId: /*parentId*/ ctx[5],
    				canCancle: true
    			},
    			$$inline: true
    		});

    	quilleditor.$on("cancle", /*cancle_handler*/ ctx[22]);
    	quilleditor.$on("update", /*update_handler*/ ctx[23]);

    	const block = {
    		c: function create() {
    			create_component(quilleditor.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(quilleditor, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const quilleditor_changes = {};
    			if (dirty[0] & /*content*/ 1) quilleditor_changes.content = /*content*/ ctx[0];
    			if (dirty[0] & /*images*/ 2) quilleditor_changes.images = /*images*/ ctx[1];
    			if (dirty[0] & /*_id*/ 4) quilleditor_changes._id = /*_id*/ ctx[2];
    			if (dirty[0] & /*parentId*/ 32) quilleditor_changes.parentId = /*parentId*/ ctx[5];
    			quilleditor.$set(quilleditor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(quilleditor.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(quilleditor.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(quilleditor, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(143:4) {#if editMode}",
    		ctx
    	});

    	return block;
    }

    // (166:8) {#each images as { domain, key }
    function create_each_block_1$3(key_1, ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "w-32 h-32 rounded-md mr-2 mb-2 object-cover");
    			if (img.src !== (img_src_value = /*domain*/ ctx[31] + "/" + /*key*/ ctx[32])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file$5, 166, 12, 5765);
    			this.first = img;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*images*/ 2 && img.src !== (img_src_value = /*domain*/ ctx[31] + "/" + /*key*/ ctx[32])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$3.name,
    		type: "each",
    		source: "(166:8) {#each images as { domain, key }",
    		ctx
    	});

    	return block;
    }

    // (174:4) {#if parent != undefined && parent != null}
    function create_if_block$4(ctx) {
    	let button;
    	let i;
    	let t0;
    	let div;
    	let t1_value = plainContent(/*parent*/ ctx[4].content) + "";
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			div = element("div");
    			t1 = text(t1_value);
    			attr_dev(i, "class", "ri-arrow-up-circle-fill transform  -rotate-45 text-gray-500");
    			add_location(i, file$5, 180, 12, 6219);
    			attr_dev(div, "class", "text-gray-500 text-sm");
    			set_style(div, "-webkit-line-clamp", "1");
    			set_style(div, "text-overflow", "ellipsis");
    			set_style(div, "display", "-webkit-box");
    			set_style(div, "-webkit-box-orient", "vertical");
    			set_style(div, "overflow", "hidden");
    			add_location(div, file$5, 183, 12, 6336);
    			attr_dev(button, "class", "flex items-center space-x-1  hover:shadow-sm focus:outline-none");
    			add_location(button, file$5, 174, 8, 6008);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(button, t0);
    			append_dev(button, div);
    			append_dev(div, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[24], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*parent*/ 16 && t1_value !== (t1_value = plainContent(/*parent*/ ctx[4].content) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(174:4) {#if parent != undefined && parent != null}",
    		ctx
    	});

    	return block;
    }

    // (197:4) {#each children as item}
    function create_each_block$4(ctx) {
    	let button;
    	let i;
    	let t0;
    	let div;
    	let t1_value = plainContent(/*item*/ ctx[28].content) + "";
    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_5() {
    		return /*click_handler_5*/ ctx[25](/*item*/ ctx[28]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			i = element("i");
    			t0 = space();
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(i, "class", "ri-arrow-down-circle-fill transform  -rotate-45 text-gray-500");
    			add_location(i, file$5, 203, 12, 6932);
    			attr_dev(div, "class", "text-gray-500 text-sm");
    			set_style(div, "-webkit-line-clamp", "1");
    			set_style(div, "text-overflow", "ellipsis");
    			set_style(div, "display", "-webkit-box");
    			set_style(div, "-webkit-box-orient", "vertical");
    			set_style(div, "overflow", "hidden");
    			add_location(div, file$5, 206, 12, 7051);
    			attr_dev(button, "class", "flex items-center  space-x-1   hover:shadow-sm focus:outline-none");
    			add_location(button, file$5, 197, 8, 6721);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, i);
    			append_dev(button, t0);
    			append_dev(button, div);
    			append_dev(div, t1);
    			append_dev(button, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_5, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*children*/ 64 && t1_value !== (t1_value = plainContent(/*item*/ ctx[28].content) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$4.name,
    		type: "each",
    		source: "(197:4) {#each children as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div4;
    	let div2;
    	let div0;
    	let t0_value = dayjs_min(/*created_at*/ ctx[3]).format("YYYY-MM-DD HH:mm:ss") + "";
    	let t0;
    	let t1;
    	let div1;
    	let button;
    	let i;
    	let t2;
    	let t3;
    	let current_block_type_index;
    	let if_block1;
    	let t4;
    	let div3;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t5;
    	let t6;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*openMore*/ ctx[9] == true && create_if_block_2$2(ctx);
    	const if_block_creators = [create_if_block_1$3, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*editMode*/ ctx[10]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let each_value_1 = /*images*/ ctx[1];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*index*/ ctx[34];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$3, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$3(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1$3(key, child_ctx));
    	}

    	let if_block2 = /*parent*/ ctx[4] != undefined && /*parent*/ ctx[4] != null && create_if_block$4(ctx);
    	let each_value = /*children*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			button = element("button");
    			i = element("i");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			if_block1.c();
    			t4 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			if (if_block2) if_block2.c();
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "text-sm text-gray-500");
    			add_location(div0, file$5, 95, 8, 3067);
    			attr_dev(i, "class", "ri-more-line");
    			add_location(i, file$5, 100, 16, 3312);
    			attr_dev(button, "class", "focus:outline-none ");
    			add_location(button, file$5, 99, 12, 3227);
    			attr_dev(div1, "class", "relative");
    			add_location(div1, file$5, 98, 8, 3191);
    			attr_dev(div2, "class", "flex justify-between");
    			add_location(div2, file$5, 94, 4, 3023);
    			attr_dev(div3, "class", "flex flex-wrap flex-row  mt-4  pl-3");
    			add_location(div3, file$5, 164, 4, 5644);
    			attr_dev(div4, "class", "w-full p-4 rounded-lg bg-white mb-4 shadow-sm  hover:shadow-lg");
    			add_location(div4, file$5, 93, 0, 2941);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			append_dev(button, i);
    			append_dev(div1, t2);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div4, t3);
    			if_blocks[current_block_type_index].m(div4, null);
    			append_dev(div4, t4);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append_dev(div4, t5);
    			if (if_block2) if_block2.m(div4, null);
    			append_dev(div4, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty[0] & /*created_at*/ 8) && t0_value !== (t0_value = dayjs_min(/*created_at*/ ctx[3]).format("YYYY-MM-DD HH:mm:ss") + "")) set_data_dev(t0, t0_value);

    			if (/*openMore*/ ctx[9] == true) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty[0] & /*openMore*/ 512) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div1, null);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block1 = if_blocks[current_block_type_index];

    				if (!if_block1) {
    					if_block1 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block1.c();
    				} else {
    					if_block1.p(ctx, dirty);
    				}

    				transition_in(if_block1, 1);
    				if_block1.m(div4, t4);
    			}

    			if (dirty[0] & /*images*/ 2) {
    				each_value_1 = /*images*/ ctx[1];
    				validate_each_argument(each_value_1);
    				validate_each_keys(ctx, each_value_1, get_each_context_1$3, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div3, destroy_block, create_each_block_1$3, null, get_each_context_1$3);
    			}

    			if (/*parent*/ ctx[4] != undefined && /*parent*/ ctx[4] != null) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$4(ctx);
    					if_block2.c();
    					if_block2.m(div4, t6);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty[0] & /*children*/ 64) {
    				each_value = /*children*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$4(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (if_block0) if_block0.d();
    			if_blocks[current_block_type_index].d();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			if (if_block2) if_block2.d();
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let current;

    function plainContent(content) {
    	let aa = document.createElement("div");
    	aa.insertAdjacentHTML("afterbegin", content);
    	return aa.textContent;
    }

    function action(params) {
    	params.focus();
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("FmoloItem", slots, []);
    	const dispatch = createEventDispatcher();
    	let { _id = "" } = $$props;
    	let { created_at = "2021-02-01 11:12:24" } = $$props;
    	let { content = "" } = $$props;
    	let { images = [] } = $$props;
    	let { parent = null } = $$props;
    	let { parentId = "" } = $$props;
    	let { children = [] } = $$props;
    	let { searchContent = "" } = $$props;
    	let { tags = [] } = $$props;
    	let moreList;
    	let openMore = false;
    	let editMode = false;

    	function toggleMoreWindow(node) {
    		if (node == 2) {
    			$$invalidate(9, openMore = false);
    		}
    	}

    	function toggleMore(node) {
    		$$invalidate(9, openMore = !openMore);
    	}

    	function toggleEditMode(params) {
    		$$invalidate(10, editMode = !editMode);
    	}

    	function deleteNeno(_id) {
    		deleteOne({ _id }).then(async respone => {
    			let re = await respone.json();
    			let code = re.code;

    			if (code == 200) {
    				dispatch("deleteOne", { _id });
    			}
    		}).catch(reason => {
    			console.log(reason);
    		});
    	}

    	document.tagClick = tag => {
    		console.log("tagClick", tag.innerText);
    	};

    	function praseTag(rawContent, tags) {
    		let pContent = "";
    		let pIndex = 0;
    		let copyRawContent = rawContent;

    		if (tags != null) {
    			for (let index = 0; index < tags.length; index++) {
    				let rawtag = tags[index];
    				let breakIndex = rawContent.indexOf(rawtag);

    				//截取前段的字符
    				pContent += rawContent.substring(0, breakIndex);

    				//加上替换的内容
    				pContent += `<span  style="padding:2px" class=" cursor-pointer rounded-sm bg-green-500 text-white text-sm  hover:bg-green-600" id="tagtag" onclick="tagClick(this)">
	${rawtag}
	</span>`;

    				rawContent = rawContent.substring(breakIndex + rawtag.length);
    				pIndex += breakIndex + rawtag.length;
    			}
    		}

    		pContent += copyRawContent.substring(pIndex);

    		if (searchContent.length != 0) {
    			pContent = pContent.replaceAll(searchContent, `<span class="bg-yellow-400">${searchContent}</span>`);
    		}

    		return pContent;
    	}

    	const writable_props = [
    		"_id",
    		"created_at",
    		"content",
    		"images",
    		"parent",
    		"parentId",
    		"children",
    		"searchContent",
    		"tags"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<FmoloItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => toggleMore();

    	const click_handler_1 = () => {
    		toggleEditMode();
    	};

    	const click_handler_2 = () => {
    		showFmolo(_id, false);
    	};

    	const click_handler_3 = () => {
    		deleteNeno(_id);
    	};

    	const blur_handler = () => {
    		setTimeout(
    			() => {
    				toggleMore();
    			},
    			150
    		);
    	};

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			moreList = $$value;
    			$$invalidate(8, moreList);
    		});
    	}

    	const cancle_handler = () => {
    		$$invalidate(10, editMode = false);
    	};

    	const update_handler = event => {
    		console.log(event.detail);
    		$$invalidate(1, images = event.detail.images);
    		$$invalidate(0, content = event.detail.content);
    	};

    	const click_handler_4 = () => {
    		showFmolo(parent._id, false);
    	};

    	const click_handler_5 = item => {
    		showFmolo(item._id, false);
    	};

    	$$self.$$set = $$props => {
    		if ("_id" in $$props) $$invalidate(2, _id = $$props._id);
    		if ("created_at" in $$props) $$invalidate(3, created_at = $$props.created_at);
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("images" in $$props) $$invalidate(1, images = $$props.images);
    		if ("parent" in $$props) $$invalidate(4, parent = $$props.parent);
    		if ("parentId" in $$props) $$invalidate(5, parentId = $$props.parentId);
    		if ("children" in $$props) $$invalidate(6, children = $$props.children);
    		if ("searchContent" in $$props) $$invalidate(15, searchContent = $$props.searchContent);
    		if ("tags" in $$props) $$invalidate(7, tags = $$props.tags);
    	};

    	$$self.$capture_state = () => ({
    		current,
    		showFmolo,
    		QuillEditor,
    		fade,
    		deleteOne,
    		createEventDispatcher,
    		dayjs: dayjs_min,
    		dispatch,
    		_id,
    		created_at,
    		content,
    		images,
    		parent,
    		parentId,
    		children,
    		searchContent,
    		tags,
    		plainContent,
    		moreList,
    		openMore,
    		editMode,
    		toggleMoreWindow,
    		action,
    		toggleMore,
    		toggleEditMode,
    		deleteNeno,
    		praseTag
    	});

    	$$self.$inject_state = $$props => {
    		if ("_id" in $$props) $$invalidate(2, _id = $$props._id);
    		if ("created_at" in $$props) $$invalidate(3, created_at = $$props.created_at);
    		if ("content" in $$props) $$invalidate(0, content = $$props.content);
    		if ("images" in $$props) $$invalidate(1, images = $$props.images);
    		if ("parent" in $$props) $$invalidate(4, parent = $$props.parent);
    		if ("parentId" in $$props) $$invalidate(5, parentId = $$props.parentId);
    		if ("children" in $$props) $$invalidate(6, children = $$props.children);
    		if ("searchContent" in $$props) $$invalidate(15, searchContent = $$props.searchContent);
    		if ("tags" in $$props) $$invalidate(7, tags = $$props.tags);
    		if ("moreList" in $$props) $$invalidate(8, moreList = $$props.moreList);
    		if ("openMore" in $$props) $$invalidate(9, openMore = $$props.openMore);
    		if ("editMode" in $$props) $$invalidate(10, editMode = $$props.editMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		content,
    		images,
    		_id,
    		created_at,
    		parent,
    		parentId,
    		children,
    		tags,
    		moreList,
    		openMore,
    		editMode,
    		toggleMore,
    		toggleEditMode,
    		deleteNeno,
    		praseTag,
    		searchContent,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		blur_handler,
    		div_binding,
    		cancle_handler,
    		update_handler,
    		click_handler_4,
    		click_handler_5
    	];
    }

    class FmoloItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$5,
    			create_fragment$5,
    			safe_not_equal,
    			{
    				_id: 2,
    				created_at: 3,
    				content: 0,
    				images: 1,
    				parent: 4,
    				parentId: 5,
    				children: 6,
    				searchContent: 15,
    				tags: 7
    			},
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FmoloItem",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get _id() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set _id(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get created_at() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set created_at(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get content() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set content(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get images() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set images(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parent() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parent(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get parentId() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set parentId(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get children() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set children(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get searchContent() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set searchContent(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tags() {
    		throw new Error("<FmoloItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tags(value) {
    		throw new Error("<FmoloItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\SettingSlide.svelte generated by Svelte v3.32.3 */

    const { console: console_1$4 } = globals;
    const file$6 = "src\\components\\SettingSlide.svelte";

    // (32:0) {#if show}
    function create_if_block$5(ctx) {
    	let div1;
    	let t;
    	let div0;
    	let div1_intro;
    	let div1_outro;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*showLeft*/ ctx[1] && create_if_block_1$4(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			div0 = element("div");
    			attr_dev(div0, "class", "lt:w-4/12 w-2/12 2xl:w-8/12 float-right   h-full ");
    			add_location(div0, file$6, 46, 8, 1177);
    			attr_dev(div1, "class", "w-screen bg-black bg-opacity-50 fixed top-0 z-20 h-screen ");
    			add_location(div1, file$6, 32, 4, 645);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t);
    			append_dev(div1, div0);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*showLeft*/ ctx[1]) {
    				if (if_block) {
    					if (dirty & /*showLeft*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (div1_outro) div1_outro.end(1);
    				if (!div1_intro) div1_intro = create_in_transition(div1, fade, { duration: 190 });
    				div1_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (div1_intro) div1_intro.invalidate();
    			div1_outro = create_out_transition(div1, fade, { duration: 210 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching && div1_outro) div1_outro.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(32:0) {#if show}",
    		ctx
    	});

    	return block;
    }

    // (38:8) {#if showLeft}
    function create_if_block_1$4(ctx) {
    	let div;
    	let sideleft;
    	let div_intro;
    	let div_outro;
    	let current;
    	sideleft = new SideLeft({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(sideleft.$$.fragment);
    			attr_dev(div, "class", "lt:w-8/12 w-10/12 2xl:w-4/12 float-left  shadow-sm bg-gray-100 h-full p-4 flex flex-col overflow-y-scroll");
    			add_location(div, file$6, 38, 12, 845);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(sideleft, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sideleft.$$.fragment, local);

    			add_render_callback(() => {
    				if (div_outro) div_outro.end(1);
    				if (!div_intro) div_intro = create_in_transition(div, fly, { x: -200, duration: 200 });
    				div_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sideleft.$$.fragment, local);
    			if (div_intro) div_intro.invalidate();
    			div_outro = create_out_transition(div, fly, { x: -200, duration: 200 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(sideleft);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(38:8) {#if showLeft}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*show*/ ctx[0] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*show*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*show*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let showDetailss$1 = null;

    function showSlide() {
    	console.log("showSlide");
    	showDetailss$1();
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SettingSlide", slots, []);
    	let show = false;
    	let showLeft = false;

    	onMount(() => {
    		showDetailss$1 = showDetail;
    	});

    	function showDetail() {
    		$$invalidate(0, show = !show);
    		$$invalidate(1, showLeft = !showLeft);
    	}

    	function hidden() {
    		$$invalidate(0, show = false);
    		$$invalidate(1, showLeft = false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$4.warn(`<SettingSlide> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		hidden();
    	};

    	$$self.$capture_state = () => ({
    		showDetailss: showDetailss$1,
    		showSlide,
    		fly,
    		fade,
    		SideLeft,
    		onMount,
    		show,
    		showLeft,
    		showDetail,
    		hidden
    	});

    	$$self.$inject_state = $$props => {
    		if ("show" in $$props) $$invalidate(0, show = $$props.show);
    		if ("showLeft" in $$props) $$invalidate(1, showLeft = $$props.showLeft);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [show, showLeft, hidden, click_handler];
    }

    class SettingSlide extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SettingSlide",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\SideRight.svelte generated by Svelte v3.32.3 */

    const { Error: Error_1, console: console_1$5 } = globals;
    const file$7 = "src\\components\\SideRight.svelte";

    function get_each_context_1$4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context$5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    // (141:4) {#if isLoding}
    function create_if_block_2$3(ctx) {
    	let div;
    	let progressline;
    	let div_transition;
    	let current;
    	progressline = new ProgressLine({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(progressline.$$.fragment);
    			attr_dev(div, "class", "w-full ");
    			add_location(div, file$7, 141, 8, 4631);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(progressline, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(progressline.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { y: -20, duration: 1000 }, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(progressline.$$.fragment, local);
    			if (!div_transition) div_transition = create_bidirectional_transition(div, fly, { y: -20, duration: 1000 }, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(progressline);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(141:4) {#if isLoding}",
    		ctx
    	});

    	return block;
    }

    // (146:4) {#if isLodingError}
    function create_if_block_1$5(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "重新获取";
    			attr_dev(button, "class", " w-full rounded focus:outline-none m-aut bg-red-400  text-white  p-2  ");
    			add_location(button, file$7, 147, 12, 4832);
    			attr_dev(div, "class", "w-full pl-4 pr-4");
    			add_location(div, file$7, 146, 8, 4788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(146:4) {#if isLodingError}",
    		ctx
    	});

    	return block;
    }

    // (172:8) {:else}
    function create_else_block$2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*searchItems*/ ctx[7];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$4(get_each_context_1$4(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*searchItems, searchText, nenoItems*/ 224) {
    				each_value_1 = /*searchItems*/ ctx[7];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$4(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1$4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(172:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (161:8) {#if searchItems.length == 0}
    function create_if_block$6(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*nenoItems*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*nenoItems*/ 64) {
    				each_value = /*nenoItems*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$5(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$5(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(161:8) {#if searchItems.length == 0}",
    		ctx
    	});

    	return block;
    }

    // (173:12) {#each searchItems as item}
    function create_each_block_1$4(ctx) {
    	let fmoloitem;
    	let current;
    	const fmoloitem_spread_levels = [/*item*/ ctx[22], { searchContent: /*searchText*/ ctx[5] }];
    	let fmoloitem_props = {};

    	for (let i = 0; i < fmoloitem_spread_levels.length; i += 1) {
    		fmoloitem_props = assign(fmoloitem_props, fmoloitem_spread_levels[i]);
    	}

    	fmoloitem = new FmoloItem({ props: fmoloitem_props, $$inline: true });
    	fmoloitem.$on("deleteOne", /*deleteOne_handler_1*/ ctx[18]);

    	const block = {
    		c: function create() {
    			create_component(fmoloitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fmoloitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fmoloitem_changes = (dirty & /*searchItems, searchText*/ 160)
    			? get_spread_update(fmoloitem_spread_levels, [
    					dirty & /*searchItems*/ 128 && get_spread_object(/*item*/ ctx[22]),
    					dirty & /*searchText*/ 32 && { searchContent: /*searchText*/ ctx[5] }
    				])
    			: {};

    			fmoloitem.$set(fmoloitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fmoloitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fmoloitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fmoloitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$4.name,
    		type: "each",
    		source: "(173:12) {#each searchItems as item}",
    		ctx
    	});

    	return block;
    }

    // (162:12) {#each nenoItems as item}
    function create_each_block$5(ctx) {
    	let fmoloitem;
    	let current;
    	const fmoloitem_spread_levels = [/*item*/ ctx[22]];
    	let fmoloitem_props = {};

    	for (let i = 0; i < fmoloitem_spread_levels.length; i += 1) {
    		fmoloitem_props = assign(fmoloitem_props, fmoloitem_spread_levels[i]);
    	}

    	fmoloitem = new FmoloItem({ props: fmoloitem_props, $$inline: true });
    	fmoloitem.$on("deleteOne", /*deleteOne_handler*/ ctx[17]);

    	const block = {
    		c: function create() {
    			create_component(fmoloitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fmoloitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const fmoloitem_changes = (dirty & /*nenoItems*/ 64)
    			? get_spread_update(fmoloitem_spread_levels, [get_spread_object(/*item*/ ctx[22])])
    			: {};

    			fmoloitem.$set(fmoloitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fmoloitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fmoloitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fmoloitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$5.name,
    		type: "each",
    		source: "(162:12) {#each nenoItems as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div5;
    	let div2;
    	let div0;
    	let t0;
    	let button;
    	let i0;
    	let t1;
    	let div1;
    	let i1;
    	let t2;
    	let input;
    	let t3;
    	let i2;
    	let t4;
    	let div3;
    	let quilleditor;
    	let t5;
    	let t6;
    	let t7;
    	let div4;
    	let current_block_type_index;
    	let if_block2;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[10]);
    	quilleditor = new QuillEditor({ $$inline: true });
    	quilleditor.$on("update", /*update_handler*/ ctx[15]);
    	let if_block0 = /*isLoding*/ ctx[3] && create_if_block_2$3(ctx);
    	let if_block1 = /*isLodingError*/ ctx[4] && create_if_block_1$5(ctx);
    	const if_block_creators = [create_if_block$6, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*searchItems*/ ctx[7].length == 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("NENO ");
    			button = element("button");
    			i0 = element("i");
    			t1 = space();
    			div1 = element("div");
    			i1 = element("i");
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			i2 = element("i");
    			t4 = space();
    			div3 = element("div");
    			create_component(quilleditor.$$.fragment);
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			div4 = element("div");
    			if_block2.c();
    			attr_dev(i0, "class", "ri-settings-fill");
    			add_location(i0, file$7, 108, 16, 3616);
    			attr_dev(button, "class", "focus:outline-none text-gray-600   sm:hidden md:hidden ml-2");
    			add_location(button, file$7, 102, 17, 3402);
    			attr_dev(div0, "class", "flex flex-row items-center ");
    			add_location(div0, file$7, 101, 8, 3342);
    			attr_dev(i1, "class", "ri-search-2-line text-gray-400");
    			add_location(i1, file$7, 113, 12, 3773);
    			attr_dev(input, "class", " ml-2 bg-gray-200 focus:outline-none text-sm");
    			attr_dev(input, "type", "text");
    			add_location(input, file$7, 114, 12, 3831);
    			attr_dev(i2, "class", "ri-close-circle-fill text-gray-400");
    			add_location(i2, file$7, 124, 12, 4181);
    			attr_dev(div1, "class", "bg-gray-200 rounded-lg h-8 p-2 flex items-center");
    			add_location(div1, file$7, 112, 8, 3697);
    			attr_dev(div2, "class", "  flex flex-row items-center justify-between pr-4");
    			add_location(div2, file$7, 100, 4, 3269);
    			attr_dev(div3, "class", "p-4 ");
    			add_location(div3, file$7, 133, 4, 4425);
    			attr_dev(div4, "class", "flex flex-col overflow-y-scroll p-4 ");
    			set_style(div4, "height", /*innerHeight*/ ctx[1] - /*flowClientTop*/ ctx[2] + "px");
    			add_location(div4, file$7, 155, 4, 5080);
    			attr_dev(div5, "class", "  flex-1 flex flex-col justify-start  pt-4 pl-4 w-0");
    			add_location(div5, file$7, 99, 0, 3198);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, button);
    			append_dev(button, i0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, i1);
    			append_dev(div1, t2);
    			append_dev(div1, input);
    			set_input_value(input, /*searchText*/ ctx[5]);
    			append_dev(div1, t3);
    			append_dev(div1, i2);
    			append_dev(div5, t4);
    			append_dev(div5, div3);
    			mount_component(quilleditor, div3, null);
    			append_dev(div5, t5);
    			if (if_block0) if_block0.m(div5, null);
    			append_dev(div5, t6);
    			if (if_block1) if_block1.m(div5, null);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			if_blocks[current_block_type_index].m(div4, null);
    			/*div4_binding*/ ctx[19](div4);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[10]),
    					listen_dev(button, "click", /*click_handler*/ ctx[11], false, false, false),
    					listen_dev(input, "keydown", /*keydown_handler*/ ctx[12], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[13]),
    					listen_dev(i2, "click", /*click_handler_1*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*searchText*/ 32 && input.value !== /*searchText*/ ctx[5]) {
    				set_input_value(input, /*searchText*/ ctx[5]);
    			}

    			if (/*isLoding*/ ctx[3]) {
    				if (if_block0) {
    					if (dirty & /*isLoding*/ 8) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2$3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div5, t6);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*isLodingError*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$5(ctx);
    					if_block1.c();
    					if_block1.m(div5, t7);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block2 = if_blocks[current_block_type_index];

    				if (!if_block2) {
    					if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block2.c();
    				} else {
    					if_block2.p(ctx, dirty);
    				}

    				transition_in(if_block2, 1);
    				if_block2.m(div4, null);
    			}

    			if (!current || dirty & /*innerHeight, flowClientTop*/ 6) {
    				set_style(div4, "height", /*innerHeight*/ ctx[1] - /*flowClientTop*/ ctx[2] + "px");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(quilleditor.$$.fragment, local);
    			transition_in(if_block0);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(quilleditor.$$.fragment, local);
    			transition_out(if_block0);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_component(quilleditor);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_blocks[current_block_type_index].d();
    			/*div4_binding*/ ctx[19](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("SideRight", slots, []);
    	let flowClient;
    	let innerHeight = 0;
    	let flowClientTop = 0;
    	let isLoding = false; //加载中状态
    	let isLodingError = false; //加载错误
    	let isEnd = false; //所有内容加载完毕
    	let searchText = "";
    	let page = 0;
    	let nenoItems = [];
    	let searchItems = [];

    	onMount(() => {
    		load();

    		flowClient.addEventListener("scroll", function () {
    			if (flowClient.scrollTop == flowClient.scrollHeight - flowClient.clientHeight && !isLoding && !isEnd) {
    				page += 1;
    				load();
    			}
    		});
    	});

    	function load() {
    		$$invalidate(3, isLoding = true);
    		$$invalidate(4, isLodingError = false);

    		getAllFmolo({ page }).then(function (response) {
    			if (response.ok) {
    				return response;
    			}

    			throw new Error("Network response was not ok.");
    		}).then(async respone => {
    			let re = await respone.json();

    			if (re.body.length == 0) {
    				isEnd = true;
    			}

    			re.body.forEach(element => {
    				$$invalidate(6, nenoItems = [...nenoItems, element]);
    			});

    			$$invalidate(3, isLoding = false);
    		}).catch(reason => {
    			console.log("reason", reason);
    			$$invalidate(4, isLodingError = true);
    			$$invalidate(3, isLoding = false);
    		});
    	}

    	function searchNeno() {
    		if (searchText.length != 0) {
    			$$invalidate(3, isLoding = true);

    			search({ content: searchText }).then(function (response) {
    				if (response.ok) {
    					return response;
    				}

    				throw new Error("Network response was not ok.");
    			}).then(async respone => {
    				let re = await respone.json();
    				$$invalidate(3, isLoding = false);
    				$$invalidate(7, searchItems = re.body);
    			}).catch(reason => {
    				console.log("reason", reason); // re.body.forEach((element) => {
    				//     searchItems = [...searchItems, element];
    				// });

    				$$invalidate(3, isLoding = false);
    			});
    		} else {
    			$$invalidate(7, searchItems = []);
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$5.warn(`<SideRight> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(1, innerHeight = window.innerHeight);
    	}

    	const click_handler = () => {
    		showSlide();
    	};

    	const keydown_handler = event => {
    		if (event.code == "Enter") {
    			searchNeno();
    		}
    	};

    	function input_input_handler() {
    		searchText = this.value;
    		$$invalidate(5, searchText);
    	}

    	const click_handler_1 = () => {
    		$$invalidate(5, searchText = "");
    		$$invalidate(7, searchItems = []);
    	};

    	const update_handler = event => {
    		$$invalidate(6, nenoItems = [event.detail, ...nenoItems]);
    	};

    	const click_handler_2 = () => {
    		load();
    	};

    	const deleteOne_handler = event => {
    		$$invalidate(6, nenoItems = nenoItems.filter(item => {
    			return item._id != event.detail._id;
    		}));
    	};

    	const deleteOne_handler_1 = event => {
    		$$invalidate(6, nenoItems = nenoItems.filter(item => {
    			return item._id != event.detail._id;
    		}));
    	};

    	function div4_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			flowClient = $$value;
    			$$invalidate(0, flowClient);
    		});
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fly,
    		pagedd,
    		QuillEditor,
    		FmoloItem,
    		getAllFmolo,
    		search,
    		ProgressLine,
    		showSlide,
    		flowClient,
    		innerHeight,
    		flowClientTop,
    		isLoding,
    		isLodingError,
    		isEnd,
    		searchText,
    		page,
    		nenoItems,
    		searchItems,
    		load,
    		searchNeno
    	});

    	$$self.$inject_state = $$props => {
    		if ("flowClient" in $$props) $$invalidate(0, flowClient = $$props.flowClient);
    		if ("innerHeight" in $$props) $$invalidate(1, innerHeight = $$props.innerHeight);
    		if ("flowClientTop" in $$props) $$invalidate(2, flowClientTop = $$props.flowClientTop);
    		if ("isLoding" in $$props) $$invalidate(3, isLoding = $$props.isLoding);
    		if ("isLodingError" in $$props) $$invalidate(4, isLodingError = $$props.isLodingError);
    		if ("isEnd" in $$props) isEnd = $$props.isEnd;
    		if ("searchText" in $$props) $$invalidate(5, searchText = $$props.searchText);
    		if ("page" in $$props) page = $$props.page;
    		if ("nenoItems" in $$props) $$invalidate(6, nenoItems = $$props.nenoItems);
    		if ("searchItems" in $$props) $$invalidate(7, searchItems = $$props.searchItems);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*flowClient*/ 1) {
    			 {
    				if (flowClient != undefined) {
    					let flowClientBoundingClientRect = flowClient.getBoundingClientRect();
    					$$invalidate(2, flowClientTop = flowClientBoundingClientRect.top);
    				}
    			}
    		}
    	};

    	return [
    		flowClient,
    		innerHeight,
    		flowClientTop,
    		isLoding,
    		isLodingError,
    		searchText,
    		nenoItems,
    		searchItems,
    		load,
    		searchNeno,
    		onwindowresize,
    		click_handler,
    		keydown_handler,
    		input_input_handler,
    		click_handler_1,
    		update_handler,
    		click_handler_2,
    		deleteOne_handler,
    		deleteOne_handler_1,
    		div4_binding
    	];
    }

    class SideRight extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SideRight",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src\components\Setting.svelte generated by Svelte v3.32.3 */

    const { Object: Object_1$1, console: console_1$6 } = globals;
    const file$8 = "src\\components\\Setting.svelte";

    function create_fragment$8(ctx) {
    	let div4;
    	let div0;
    	let button0;
    	let i;
    	let t0;
    	let t1;
    	let t2;
    	let div1;
    	let label0;
    	let t4;
    	let select;
    	let option;
    	let t6;
    	let div2;
    	let label1;
    	let t8;
    	let input;
    	let t9;
    	let div3;
    	let button1;
    	let t10;
    	let t11;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			i = element("i");
    			t0 = space();
    			t1 = text("设置");
    			t2 = space();
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "图库平台";
    			t4 = space();
    			select = element("select");
    			option = element("option");
    			option.textContent = "七牛云";
    			t6 = space();
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "图库域名";
    			t8 = space();
    			input = element("input");
    			t9 = space();
    			div3 = element("div");
    			button1 = element("button");
    			t10 = text("保存");
    			t11 = text(/*done*/ ctx[2]);
    			attr_dev(i, "class", "ri-arrow-left-line");
    			add_location(i, file$8, 51, 12, 1612);
    			attr_dev(button0, "class", "focus:outline-none text-gray-600   sm:hidden md:hidden mr-4");
    			add_location(button0, file$8, 45, 8, 1417);
    			attr_dev(div0, "class", "font-bold text-lg flex  justify-start  items-center");
    			add_location(div0, file$8, 44, 4, 1342);
    			attr_dev(label0, "for", "");
    			add_location(label0, file$8, 55, 8, 1724);
    			attr_dev(option, "class", "p-2");
    			option.__value = "七牛云";
    			option.value = option.__value;
    			add_location(option, file$8, 58, 12, 1878);
    			attr_dev(select, "class", "p-2 mt-4");
    			if (/*platform*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[6].call(select));
    			add_location(select, file$8, 56, 8, 1760);
    			attr_dev(div1, "class", "m-4 flex flex-col");
    			add_location(div1, file$8, 54, 4, 1683);
    			attr_dev(label1, "for", "");
    			add_location(label1, file$8, 62, 8, 1986);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "w-full border-2  mt-4 outline-white p-2");
    			attr_dev(input, "placeholder", "https://img.fmolo.bijiduo.com");
    			add_location(input, file$8, 63, 8, 2022);
    			attr_dev(div2, "class", "m-4");
    			add_location(div2, file$8, 61, 4, 1959);
    			attr_dev(button1, "class", "w-full border-2   outline-white p-2 hover:bg-green-500 hover:text-white focus:outline-white");
    			add_location(button1, file$8, 71, 8, 2261);
    			attr_dev(div3, "class", "m-4");
    			add_location(div3, file$8, 70, 4, 2234);
    			attr_dev(div4, "class", "  flex-1 flex flex-col justify-start  pt-4 pl-4 ");
    			add_location(div4, file$8, 43, 0, 1274);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, button0);
    			append_dev(button0, i);
    			append_dev(button0, t0);
    			append_dev(div0, t1);
    			append_dev(div4, t2);
    			append_dev(div4, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t4);
    			append_dev(div1, select);
    			append_dev(select, option);
    			select_option(select, /*platform*/ ctx[0]);
    			append_dev(div4, t6);
    			append_dev(div4, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t8);
    			append_dev(div2, input);
    			set_input_value(input, /*domain*/ ctx[1]);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, button1);
    			append_dev(button1, t10);
    			append_dev(button1, t11);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[6]),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*platform*/ 1) {
    				select_option(select, /*platform*/ ctx[0]);
    			}

    			if (dirty & /*domain*/ 2 && input.value !== /*domain*/ ctx[1]) {
    				set_input_value(input, /*domain*/ ctx[1]);
    			}

    			if (dirty & /*done*/ 4) set_data_dev(t11, /*done*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $settingStrore;
    	let $pagedd;
    	validate_store(settingStrore, "settingStrore");
    	component_subscribe($$self, settingStrore, $$value => $$invalidate(9, $settingStrore = $$value));
    	validate_store(pagedd, "pagedd");
    	component_subscribe($$self, pagedd, $$value => $$invalidate(3, $pagedd = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Setting", slots, []);
    	let platform = $settingStrore.platform;
    	let domain = $settingStrore.domain;
    	let done = "";

    	onMount(() => {
    		setting().then(async respone => {
    			let re = await respone.json();

    			if (Object.keys(re.body).length == 0) {
    				console.log($settingStrore);

    				setting($settingStrore).then(async respone => {
    					
    				});
    			} else {
    				set_store_value(settingStrore, $settingStrore = re.body, $settingStrore);
    			}
    		}).catch(reason => {
    			console.log(reason);
    		});
    	});

    	function saveSetting() {
    		set_store_value(settingStrore, $settingStrore.domain = domain, $settingStrore);
    		set_store_value(settingStrore, $settingStrore.platform = platform, $settingStrore);

    		setting($settingStrore).then(async respone => {
    			$$invalidate(2, done = "成功");

    			setTimeout(
    				() => {
    					$$invalidate(2, done = "");
    				},
    				1500
    			);
    		}).catch(reason => {
    			console.log(reason);
    		});
    	}

    	const writable_props = [];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$6.warn(`<Setting> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		set_store_value(pagedd, $pagedd = "neno", $pagedd);
    	};

    	function select_change_handler() {
    		platform = select_value(this);
    		$$invalidate(0, platform);
    	}

    	function input_input_handler() {
    		domain = this.value;
    		$$invalidate(1, domain);
    	}

    	const click_handler_1 = () => {
    		saveSetting();
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		setting,
    		settingStrore,
    		pagedd,
    		platform,
    		domain,
    		done,
    		saveSetting,
    		$settingStrore,
    		$pagedd
    	});

    	$$self.$inject_state = $$props => {
    		if ("platform" in $$props) $$invalidate(0, platform = $$props.platform);
    		if ("domain" in $$props) $$invalidate(1, domain = $$props.domain);
    		if ("done" in $$props) $$invalidate(2, done = $$props.done);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		platform,
    		domain,
    		done,
    		$pagedd,
    		saveSetting,
    		click_handler,
    		select_change_handler,
    		input_input_handler,
    		click_handler_1
    	];
    }

    class Setting extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Setting",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src\components\HelloWorld.svelte generated by Svelte v3.32.3 */
    const file$9 = "src\\components\\HelloWorld.svelte";

    // (23:35) 
    function create_if_block_1$6(ctx) {
    	let setting;
    	let current;
    	setting = new Setting({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(setting.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(setting, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(setting.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(setting.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(setting, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$6.name,
    		type: "if",
    		source: "(23:35) ",
    		ctx
    	});

    	return block;
    }

    // (21:4) {#if $pagedd == "neno"}
    function create_if_block$7(ctx) {
    	let sideright;
    	let current;
    	sideright = new SideRight({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sideright.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sideright, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sideright.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sideright.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sideright, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$7.name,
    		type: "if",
    		source: "(21:4) {#if $pagedd == \\\"neno\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let sideleft;
    	let t0;
    	let current_block_type_index;
    	let if_block;
    	let t1;
    	let fmolodetail;
    	let t2;
    	let settingslide;
    	let current;
    	sideleft = new SideLeft({ $$inline: true });
    	const if_block_creators = [create_if_block$7, create_if_block_1$6];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$pagedd*/ ctx[0] == "neno") return 0;
    		if (/*$pagedd*/ ctx[0] == "setting") return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	fmolodetail = new FmoloDetail({ $$inline: true });
    	settingslide = new SettingSlide({ $$inline: true });

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			create_component(sideleft.$$.fragment);
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			create_component(fmolodetail.$$.fragment);
    			t2 = space();
    			create_component(settingslide.$$.fragment);
    			attr_dev(div0, "class", "hidden  sm:flex md:flex flex-col items-start");
    			set_style(div0, "width", "240px");
    			add_location(div0, file$9, 14, 4, 441);
    			attr_dev(div1, "class", "max-w-6xl min-w-0 w-full  flex ");
    			add_location(div1, file$9, 13, 2, 391);
    			attr_dev(div2, "class", "w-full  h-screen flex flex-col items-center justify-start  bg-gray-100");
    			add_location(div2, file$9, 10, 0, 301);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			mount_component(sideleft, div0, null);
    			append_dev(div1, t0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div1, null);
    			}

    			append_dev(div2, t1);
    			mount_component(fmolodetail, div2, null);
    			append_dev(div2, t2);
    			mount_component(settingslide, div2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sideleft.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(fmolodetail.$$.fragment, local);
    			transition_in(settingslide.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sideleft.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(fmolodetail.$$.fragment, local);
    			transition_out(settingslide.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(sideleft);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			destroy_component(fmolodetail);
    			destroy_component(settingslide);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let $pagedd;
    	validate_store(pagedd, "pagedd");
    	component_subscribe($$self, pagedd, $$value => $$invalidate(0, $pagedd = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("HelloWorld", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<HelloWorld> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		SideLeft,
    		SideRight,
    		Setting,
    		SettingSlide,
    		FmoloDetail,
    		pagedd,
    		$pagedd
    	});

    	return [$pagedd];
    }

    class HelloWorld extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HelloWorld",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src\components\Router.svelte generated by Svelte v3.32.3 */

    const { console: console_1$7 } = globals;

    function create_fragment$a(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, []);

    	window.onload = function () {
    		if (window.location.search.length > 0) {
    			const params = window.location.search.substr(1);

    			params.split("&").forEach(param => {
    				const key = param.split("=")[0];
    				const value = parseFloat(param.split("=")[1]);
    				console.log(`Parameter of ${key} is ${value}`);
    			});
    		}
    	};

    	/**
     * Handle broswer back events here
     */
    	window.onpopstate = function (event) {
    		if (event.state) ;
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$7.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.32.3 */

    const { Object: Object_1$2, console: console_1$8 } = globals;
    const file$a = "src\\App.svelte";

    function create_fragment$b(ctx) {
    	let main;
    	let router;
    	let t;
    	let helloworld;
    	let current;
    	router = new Router({ $$inline: true });
    	helloworld = new HelloWorld({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(router.$$.fragment);
    			t = space();
    			create_component(helloworld.$$.fragment);
    			attr_dev(main, "class", "overflow-y-hidden f h-screen");
    			add_location(main, file$a, 29, 0, 814);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(router, main, null);
    			append_dev(main, t);
    			mount_component(helloworld, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			transition_in(helloworld.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			transition_out(helloworld.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router);
    			destroy_component(helloworld);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $settingStrore;
    	validate_store(settingStrore, "settingStrore");
    	component_subscribe($$self, settingStrore, $$value => $$invalidate(0, $settingStrore = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);

    	onMount(() => {
    		setting().then(async respone => {
    			let re = await respone.json();
    			console.log($settingStrore);

    			if (Object.keys(re.body).length == 0) {
    				console.log($settingStrore);

    				setting($settingStrore).then(async respone => {
    					
    				});
    			} else {
    				set_store_value(settingStrore, $settingStrore = re.body, $settingStrore);
    			}
    		}).catch(reason => {
    			console.log(reason);
    		});
    	});

    	const writable_props = [];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$8.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		HelloWorld,
    		Router,
    		setting,
    		settingStrore,
    		onMount,
    		$settingStrore
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

}());
//# sourceMappingURL=main.js.map
